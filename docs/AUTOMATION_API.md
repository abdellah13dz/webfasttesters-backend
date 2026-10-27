# FastTesters Automation API (Make.com)

Scoped HTTP API for marketing automation. It writes **unpublished drafts** into the existing Prisma `Article` CMS used by the Admin panel. It does **not** replace Admin, publish posts, or change public URLs.

Base path: `/api/automation/v1`

OpenAPI: `GET /api/automation/v1/openapi.json` (unauthenticated)

---

## Architecture audit (Phase 1)

| Area | Finding |
|------|---------|
| Framework | Express + TypeScript (`website/backend`) |
| ORM / DB | Prisma → PostgreSQL |
| Blog model | `Article` — flat fields, no Tag/Category tables |
| Admin create/edit | `POST/PUT /api/admin/articles` (JWT admin) |
| Admin auth | Email/password → JWT (`requireAdmin`), role `admin` |
| SEO fields | `seoTitle`, `seoDescription`, `seoKeywords` |
| Images | Admin uploads → R2 (or local `/uploads`); articles store `coverImage` URL |
| Publication | `status`: `draft` \| `published` \| `hidden`; public API only returns `published` |
| Tags | **Not a DB relation** — keywords live in `seoKeywords` (comma-separated) |
| Audit | `AdminAuditLog` via `writeAuditLog` |

### Field mapping (Make ↔ existing schema)

| Automation API | Prisma `Article` |
|----------------|------------------|
| `title` | `title` |
| `slug` | `slug` |
| `excerpt` | `description` |
| `content` / `body` | `content` |
| `seo_title` | `seoTitle` |
| `meta_description` | `seoDescription` |
| `primary_keyword` + `secondary_keywords` / `tags` | `seoKeywords` (joined) |
| `category` | `category` (string) |
| `featured_image` | `coverImage` |
| `status` | `status` (forced `draft` on write) |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` |
| `canonical_url` | **Not in schema** — ignored / unsupported |

---

## Endpoints

| Method | Path | Scope | Notes |
|--------|------|-------|-------|
| GET | `/health` | none | Liveness |
| GET | `/openapi.json` | none | Spec |
| GET | `/blog/posts` | `blog:read` | Pagination + filters |
| GET | `/blog/posts/:id` | `blog:read` | id or slug |
| POST | `/blog/drafts` | `blog:draft:create` | Always `status=draft` |
| PATCH | `/blog/drafts/:id` | `blog:draft:update` | Drafts only; publish blocked |
| GET | `/blog/categories` | `blog:read` | Distinct categories |
| GET | `/blog/tags` | `blog:read` | Derived from `seoKeywords` |
| POST | `/uploads/image` | `media:upload` | Multipart image → R2 `blog/` (not granted by default) |
| POST | `/blog/drafts/:id/publish` | `blog:publish` | Publish existing draft (same ID) |
| PATCH | `/blog/published/:id` | `blog:update_published` | Update published; never unpublishes |
| GET | `/blog/articles/:id/revisions` | `blog:revisions:read` | List revisions |
| GET | `/blog/articles/:id/revisions/:revisionId` | `blog:revisions:read` | Revision snapshot |
| POST | `/blog/articles/:id/revisions/:revisionId/rollback` | `blog:rollback` | Restore revision; stays published |

Security features: hashed API keys (`SHA-256`), scoped auth, per-key rate limit, request IDs (`X-Request-Id`), input sanitization, idempotency (`Idempotency-Key` on create/publish/update/**rollback**), article revisions, audit logs (`userEmail` = `automation:<name>`).

**No** access to passwords, SMTP secrets, payments, R2 credentials, or unrelated admin routes. Admin JWT is **not** accepted. New publish scopes are **not** granted by default.

---

## Publishing & published updates

**Public URL convention:** `https://fasttesters.com/blog/{slug}` (from `SITE_URL` / `FRONTEND_URL`).  
**Verification:** after publish/update, the API re-queries with the same filter as public `GET /api/articles?slug=` (`status=published`).

### Grant scopes (explicit)

```bash
npm run automation:grant-scope -- --prefix ft_auto_usPRENt4 --scope blog:publish
npm run automation:grant-scope -- --prefix ft_auto_usPRENt4 --scope blog:update_published
npm run automation:grant-scope -- --prefix ft_auto_usPRENt4 --scope blog:revisions:read
npm run automation:grant-scope -- --prefix ft_auto_usPRENt4 --scope blog:rollback
```

### Migration (required before using these endpoints)

```bash
npx prisma migrate deploy
# migration: 20261027120000_article_publish_revisions
# adds Article.publishedAt + ArticleRevision table
```

Do not apply to production until approved.

### Publish draft

```http
POST /api/automation/v1/blog/drafts/{id}/publish
Authorization: Bearer ft_auto_…
Idempotency-Key: publish-{executionId}
```

Returns `article_id`, `slug`, `status=published`, `published_at`, `public_url`, `public_accessible`, `revision_id`.  
Already published → safe `200` with `already_published: true` (no duplicate).  
Sets `publishedAt` **exactly once** on first Automation publish (does not invent historical dates).

### Update published

```http
PATCH /api/automation/v1/blog/published/{id}
Authorization: Bearer ft_auto_…
Idempotency-Key: update-{executionId}

{
  "content": "<p>Improved body</p>",
  "expected_updated_at": "2026-10-27T10:00:00.000Z"
}
```

Partial update; omitted fields unchanged. `status` cannot leave `published`. Slug unchanged unless explicitly sent. Saves a revision **before** applying changes (under a PostgreSQL `SELECT … FOR UPDATE` on the article row). Stale `expected_updated_at` / `version` / `If-Match` / concurrent writer → `409` (retryable). Ordinary updates **do not** set or reset `publishedAt` (legacy `null` stays `null`).

### Revisions & rollback

1. `GET …/blog/articles/{id}/revisions`
2. `GET …/blog/articles/{id}/revisions/{revisionId}`
3. `POST …/blog/articles/{id}/revisions/{revisionId}/rollback` — creates safety revision, restores snapshot content, **keeps published** and **current slug**.

```http
POST /api/automation/v1/blog/articles/{id}/revisions/{revisionId}/rollback
Authorization: Bearer ft_auto_…
Idempotency-Key: rollback-{executionId}
```

### Idempotency-Key (Make.com)

| Operation | Idempotency-Key | Behavior |
|-----------|-----------------|----------|
| `POST /blog/drafts` | **Strongly recommended** | Same key → replay; different body → `409` |
| `POST …/publish` | **Strongly recommended** | Same key → replay; not HTTP-mandatory |
| `PATCH …/published/:id` | **Strongly recommended** | Same key → replay; different payload → `409` |
| `POST …/rollback` | **Strongly recommended** | Same key + same article/revision → replay (no extra safety revision); same key + different article or revision → `409`; failed ops (e.g. `404`) **release** the reservation so a corrected retry can use the same key |
| `POST /uploads/image` | Not supported | Each success creates a new object |

Without `Idempotency-Key`, write endpoints still run, but Make timeouts/retries may duplicate revisions or re-apply mutations. Prefer a unique key per logical scenario step (`publish-{executionId}`, `update-{executionId}`, `rollback-{executionId}`). On `409` with `retryable: true` (concurrent update / revision conflict / in-progress key), wait briefly and retry with the **same** key and payload (or reload `version` for optimistic updates).

### Revision concurrency

Provider: **PostgreSQL**. Revision numbers are allocated inside a transaction after `SELECT id FROM "Article" WHERE id = $1 FOR UPDATE`, with a bounded retry on unique conflicts. Concurrent updates to the same article serialize; a lost optimistic race returns **HTTP 409** (not 500). Successful article content + its required revision are committed together — a conflict does not silently discard a successful update.

### Legacy `publishedAt`

`Article.publishedAt` was added without historical backfill. Admin CMS publish does not set a separate publication timestamp; `createdAt` is article creation, **not** a verified publication date. Therefore:

- Legacy published rows may have `published_at: null` — this is intentional (Option B).
- New Automation publishes set `publishedAt` once.
- Subsequent published updates / rollbacks preserve the existing value (including `null`).

### Make.com workflow

1. `GET /blog/posts/{id}` — full article (`content`, `version`, `public_url`)
2. `POST /blog/drafts/{id}/publish` + Idempotency-Key
3. Confirm `public_accessible: true` and open `public_url`
4. `GET /blog/posts/{id}` again
5. `PATCH /blog/published/{id}` with `expected_updated_at` from `version` + Idempotency-Key
6. Optional: list revisions / rollback **with** Idempotency-Key

**Fields not in CMS schema (ignored / unsupported):** separate image alt/caption tables, `canonical_url`, dedicated Tag relations (tags live in `seoKeywords`).

---

## Image upload (`POST /uploads/image`)

**URL:** `https://webapi.fasttesters.com/api/automation/v1/uploads/image`  
**Auth:** `Authorization: Bearer ft_auto_…`  
**Scope:** `media:upload` (grant explicitly — not included in default key scopes)

```bash
npm run automation:grant-scope -- --prefix ft_auto_usPRENt4 --scope media:upload
```

**Request:** `multipart/form-data` with field name **`file`** (same as Admin).  
**Max size:** 5,242,880 bytes (5 MB) → HTTP `413` if larger.  
**Types:** JPEG, PNG, WebP, GIF, SVG (SVG with scripts/event handlers rejected). Content is checked via magic bytes (not client MIME alone).  
**Storage:** Reuses existing `storeUploadedFile` → Cloudflare R2 when configured; public URL from `R2_PUBLIC_URL` (production: `https://assets.fasttesters.com/blog/…`). Folder locked to `blog/`.

**Make.com HTTP module:**

| Field | Value |
|-------|--------|
| Method | POST |
| URL | `https://webapi.fasttesters.com/api/automation/v1/uploads/image` |
| Headers | `Authorization: Bearer {{token}}` |
| Body type | Multipart / form-data |
| File field | `file` |

**Success `201`:**

```json
{
  "request_id": "…",
  "url": "https://assets.fasttesters.com/blog/cover-….webp",
  "key": "blog/cover-….webp",
  "filename": "cover-….webp",
  "storage": "r2",
  "contentType": "image/webp",
  "size": 123456,
  "data": { "url": "https://assets.fasttesters.com/blog/cover-….webp", "key": "blog/…", "…": "…" }
}
```

Use `url` as `featured_image` on `POST /blog/drafts`.

**Errors:** `401` auth · `403` missing scope · `400` validation · `413` too large · `500` storage failure.

**Retries / idempotency:** Uploads are **not** idempotent. Each successful request creates a **new** R2 object (unique server filename). On Make timeouts, prefer checking whether you already stored a URL in the scenario; avoid blind re-upload loops. Do not send draft `Idempotency-Key` semantics for multipart (body hashing is JSON-oriented).

---

## Authentication setup (Make.com)

### 1. Apply migration

```bash
cd website/backend
npx prisma migrate deploy
# or for local: npx prisma db push
```

### 2. Create a credential (Render / production)

**Preferred on Render:** set env var `AUTOMATION_API_TOKEN` to a value starting with `ft_auto_…` (generate locally once, or copy the one-time bootstrap log). On `npm start` the server syncs that token into the DB (hashed). The full token is **not** printed when synced from env.

**First deploy with no keys:** if `AUTOMATION_API_TOKEN` is unset and no active key exists, `npm start` auto-creates one key and prints it once in Render logs. Copy it into Make.com, set `AUTOMATION_API_TOKEN` to the same value, then redeploy so restarts stop printing secrets.

**Local CLI (optional):**

```bash
npm run automation:create-key -- --name "Make.com Production"
```

### 3. Production base URL

**Production (HTTPS):** `https://webapi.fasttesters.com/api/automation/v1`

Confirmed via the public website frontend (`NEXT_PUBLIC_API_URL`). Local: `http://localhost:4000/api/automation/v1`.

### 4. Configure Make.com HTTP module

- **URL**: `https://webapi.fasttesters.com/api/automation/v1/blog/drafts`
- **Method**: POST
- **Headers**:
  - `Authorization`: `Bearer ft_auto_…` (Make connection vault only — never in article body or scenario logs)
  - `Content-Type`: `application/json`
  - `Idempotency-Key`: `{{unique scenario run id}}` (**required** for safe retries)
  - `X-Request-Id`: optional correlation id

Scopes on new keys: `blog:read`, `blog:draft:create`, `blog:draft:update`.

### 5. Revoke / rotate

```bash
npm run automation:revoke-key -- --id <keyId>
# or
npm run automation:revoke-key -- --prefix ft_auto_xxxxx
```

Create a new key first, update Make, then revoke the old key.

---

## Example payloads

### Create draft

```http
POST /api/automation/v1/blog/drafts
Authorization: Bearer ft_auto_…
Idempotency-Key: make-run-abc123
Content-Type: application/json

{
  "title": "Google Play Closed Testing Checklist 2026",
  "slug": "google-play-closed-testing-checklist-2026",
  "excerpt": "A practical checklist for indie developers preparing closed testing.",
  "content": "<p>Start with your opt-in link…</p>",
  "category": "GOOGLE PLAY",
  "seo_title": "Google Play Closed Testing Checklist",
  "meta_description": "Step-by-step closed testing checklist for Google Play production access.",
  "primary_keyword": "google play closed testing",
  "secondary_keywords": ["12 testers", "14 days"],
  "tags": ["closed testing"],
  "featured_image": "https://assets.fasttesters.com/blog/example.jpg"
}
```

### Success response `201`

```json
{
  "request_id": "8f3c…",
  "data": {
    "id": "clx…",
    "title": "Google Play Closed Testing Checklist 2026",
    "slug": "google-play-closed-testing-checklist-2026",
    "excerpt": "A practical checklist…",
    "content": "<p>Start with your opt-in link…</p>",
    "seo_title": "Google Play Closed Testing Checklist",
    "meta_description": "Step-by-step closed testing checklist…",
    "primary_keyword": "google play closed testing",
    "secondary_keywords": ["12 testers", "14 days", "closed testing"],
    "tags": ["12 testers", "14 days", "closed testing"],
    "category": "GOOGLE PLAY",
    "featured_image": "https://assets.fasttesters.com/blog/example.jpg",
    "status": "draft",
    "read_time": "3 min read",
    "featured": false,
    "created_at": "2026-10-24T16:00:00.000Z",
    "updated_at": "2026-10-24T16:00:00.000Z"
  }
}
```

### Update draft

```http
PATCH /api/automation/v1/blog/drafts/{id}
Authorization: Bearer ft_auto_…

{ "excerpt": "Updated excerpt only." }
```

### Duplicate / conflict `409`

```json
{
  "request_id": "…",
  "error": "An article with this slug already exists",
  "details": { "field": "slug", "value": "…", "existing_id": "…" }
}
```

---

## Safe test procedure (temporary draft)

1. Create a key in a **non-production** database (or a disposable key you will revoke).
2. `POST /blog/drafts` with a unique title/slug prefix like `automation-test-…`.
3. `GET /blog/posts/{id}` and confirm `status` is `draft`.
4. Confirm the draft does **not** appear on `GET /api/articles` (public published-only).
5. Confirm it appears in Admin → Articles as draft.
6. Edit via `PATCH /blog/drafts/{id}`; attempt `status: "published"` and expect `403`.
7. Replay create with the same `Idempotency-Key` — expect identical body and `Idempotency-Replayed: true`.
8. Delete the test draft in Admin when finished.
9. Do **not** deploy or publish without explicit approval.

---

## Integrity confirmation

- Existing Admin routes (`/api/admin/*`) unchanged in behavior.
- Public blog (`GET /api/articles`) still filters `status: published` only.
- Automation writes always force `status: draft` and `featured: false`.
- No automatic publishing endpoint is exposed.
