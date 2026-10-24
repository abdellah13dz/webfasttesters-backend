# Make.com Integration Guide — FastTesters Automation API

Validated against the implementation in `src/routes/automation/v1` and OpenAPI at `docs/automation-api-v1.openapi.json`.

**Base URL (production, HTTPS):** `https://webapi.fasttesters.com/api/automation/v1`  
**Local:** `http://localhost:4000/api/automation/v1`

**Auth:** Make.com **Connection / custom header** only. Never Admin JWT.

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer {{automation_api_token}}` |
| `Content-Type` | `application/json` (POST/PATCH) |
| `Idempotency-Key` | Unique per logical create (POST drafts) — use scenario execution id |
| `X-Request-Id` | Optional correlation id (Make `{{executionId}}`) |

Store `{{automation_api_token}}` in Make.com **encrypted connection credentials**. Do not map the token into article `content`, scenario text aggregators, or Slack/email bodies.

---

## Connection setup

1. Create a key (once):  
   `npm run automation:create-key -- --name "Make.com Production"`
2. In Make: **HTTP → Make an API call** (or custom connection) with header auth.
3. Minimum scopes for full draft workflow: `blog:read`, `blog:draft:create`, `blog:draft:update`.
4. Rotate: create a new key → update Make connection →  
   `npm run automation:revoke-key -- --id <oldId>` (or `--prefix ft_auto_…`).

---

## HTTP module 1 — List blog posts

| Field | Value |
|-------|--------|
| Method | `GET` |
| URL | `https://webapi.fasttesters.com/api/automation/v1/blog/posts` |
| Query | `page=1&limit=20&status=draft` (optional: `category`, `slug`, `title`, `q`) |
| Headers | `Authorization: Bearer {{token}}` |

**Pagination:** `meta.page`, `meta.limit` (max 100, default 20), `meta.total`, `meta.total_pages`.  
List `data[]` is a **summary** (no `content` body).

**Expected `200`:**
```json
{
  "request_id": "…",
  "data": [{ "id": "…", "title": "…", "slug": "…", "status": "draft", "…": "…" }],
  "meta": { "page": 1, "limit": 20, "total": 42, "total_pages": 3 }
}
```

**Duplicate check pattern:** before create, call with `?title={{title}}` or `?slug={{slug}}`. Non-empty `data` → skip create / branch to PATCH.

**Errors:** `401` missing/invalid key · `403` missing `blog:read` · `429` rate limit (`Retry-After`).

---

## HTTP module 2 — Get categories

| Field | Value |
|-------|--------|
| Method | `GET` |
| URL | `https://webapi.fasttesters.com/api/automation/v1/blog/categories` |
| Headers | `Authorization: Bearer {{token}}` |

**Expected `200`:**
```json
{
  "request_id": "…",
  "data": [{ "name": "GOOGLE PLAY", "slug": "google-play" }]
}
```

**Note:** Create/update uppercases `category`. Prefer values already returned by this endpoint to avoid near-duplicate labels (`Google Play` vs `GOOGLE PLAY`).

---

## HTTP module 3 — Get tags

| Field | Value |
|-------|--------|
| Method | `GET` |
| URL | `https://webapi.fasttesters.com/api/automation/v1/blog/tags` |
| Headers | `Authorization: Bearer {{token}}` |

**Expected `200`:**
```json
{
  "request_id": "…",
  "data": [{ "name": "closed testing", "count": 3 }]
}
```

Tags are **derived** from `seoKeywords` (comma-separated). There is no Tag table. Names are normalized to lowercase in this list response.

---

## HTTP module 4 — Create draft

| Field | Value |
|-------|--------|
| Method | `POST` |
| URL | `https://webapi.fasttesters.com/api/automation/v1/blog/drafts` |
| Headers | `Authorization`, `Content-Type: application/json`, **`Idempotency-Key: {{executionId}}`** |

**Body (required: `title`, `excerpt`, `content`, `category`):**
```json
{
  "title": "{{title}}",
  "slug": "{{slug}}",
  "excerpt": "{{excerpt}}",
  "content": "{{html_content}}",
  "category": "{{category}}",
  "seo_title": "{{seo_title}}",
  "meta_description": "{{meta_description}}",
  "primary_keyword": "{{primary_keyword}}",
  "secondary_keywords": ["{{kw2}}", "{{kw3}}"],
  "tags": ["{{tag1}}"],
  "featured_image": "https://assets.fasttesters.com/blog/….jpg"
}
```

- `status` is **always** stored as `draft` (ignored if sent as publish).
- `featured_image` must be a **public HTTPS URL** (no upload endpoint on this API). Rejected: `http://`, `javascript:`, `data:`, localhost, private IPs.
- SEO maps to `seoTitle` / `seoDescription` / `seoKeywords` in CMS.
- Omit `slug` to auto-slugify from `title`.
- Concurrent retries with the **same** `Idempotency-Key` return the same draft (`201` + `Idempotency-Replayed`). Different keys + same slug → one winner, others `409`.

**Expected `201`:** `{ "request_id", "data": { …full article, "status": "draft" } }`  
**Replay:** same `Idempotency-Key` → `201` + header `Idempotency-Replayed: true` (same `data.id`).

**Error handling in Make:**

| Status | Action |
|--------|--------|
| `400` | Fix payload; do not retry blindly |
| `401`/`403` | Stop; check connection/scopes |
| `409` | Duplicate title/slug — GET post by `details.existing_id` or skip |
| `429` | Sleep `Retry-After` seconds; retry with **same** Idempotency-Key |
| `5xx` | Retry up to 3× with **same** Idempotency-Key |

---

## HTTP module 5 — Update draft

| Field | Value |
|-------|--------|
| Method | `PATCH` |
| URL | `https://webapi.fasttesters.com/api/automation/v1/blog/drafts/{{draft_id}}` |
| Headers | `Authorization`, `Content-Type: application/json` |

**Body (partial):**
```json
{
  "excerpt": "{{updated_excerpt}}",
  "content": "{{updated_html}}",
  "seo_title": "{{seo_title}}",
  "meta_description": "{{meta_description}}",
  "featured_image": "https://…"
}
```

**Forbidden:** `"status": "published"` → `403` (`Publishing is not allowed via the automation API`).  
**Only drafts:** published/hidden articles → `403`.

**Expected `200`:** `{ "request_id", "data": { …, "status": "draft" } }`

---

## Recommended scenario architecture

```
1. Trigger (RSS / schedule / webhook / OpenAI research)
2. Normalize SEO fields (title, slug, excerpt, keywords, category)
3. GET /blog/posts?slug=…  OR  ?title=…     → duplicate gate
4. Router:
   - exists → optional PATCH /blog/drafts/{id} (content refresh only)
   - missing → POST /blog/drafts (+ Idempotency-Key = execution id)
5. GET /blog/posts/{id}                     → verify status=draft
6. Notify human (Slack/email) with Admin deep-link — never auto-publish
7. Error handler: map 409/429/5xx as above
```

**Do not** add a module that sets `status=published`. Publishing remains Admin-only (`PUT /api/admin/articles/:id`).

---

## Security checklist for Make operators

- [ ] Token only in Make connection vault  
- [ ] Disable “log complete request” for modules that send `Authorization` if your Make plan exposes headers in history  
- [ ] Never echo the bearer token into article HTML  
- [ ] Use one dedicated key per environment (staging vs production)  
- [ ] Revoke keys after contractor/offboarding  
- [ ] Confirm draft is absent from public `GET /api/articles?slug=…` after create  

---

## Image & SEO notes

| Concern | Behavior |
|---------|----------|
| Featured image | Stored as `coverImage` HTTPS URL only; no binary upload; SSRF-sensitive hosts rejected |
| SEO title | `seo_title` → `seoTitle` (max ~70 chars sanitized) |
| Meta description | `meta_description` → `seoDescription` (~160) |
| Keywords/tags | Joined into `seoKeywords`; primary = first token on read |
| Canonical URL | **Not supported** (no CMS field) |
| Production host | `https://webapi.fasttesters.com` |

---

## Related docs

- Architecture & examples: `docs/AUTOMATION_API.md`
- OpenAPI: `docs/automation-api-v1.openapi.json` · `GET /api/automation/v1/openapi.json`
