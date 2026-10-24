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

Security features: hashed API keys (`SHA-256`), scoped auth, per-key rate limit, request IDs (`X-Request-Id`), input sanitization, idempotency (`Idempotency-Key` on create), audit logs (`userEmail` = `automation:<name>`).

**No** publish endpoint. **No** access to passwords, SMTP secrets, payments, or unrelated admin routes.

---

## Authentication setup (Make.com)

### 1. Apply migration

```bash
cd website/backend
npx prisma migrate deploy
# or for local: npx prisma db push
```

### 2. Create a credential (plaintext shown once)

```bash
npx tsx src/scripts/create-automation-key.ts --name "Make.com Production"
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
