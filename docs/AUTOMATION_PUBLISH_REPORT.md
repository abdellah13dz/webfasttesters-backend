# Automation Publish / Revisions — Implementation Report

## Architecture findings

| Area | Finding |
|------|---------|
| Article model | Flat Prisma `Article`; status `draft` \| `published` \| `hidden` |
| Prior publish API | None (draft create/update only; publish blocked) |
| Public retrieval | `GET /api/articles?slug=` filters `status=published` |
| Public URL | `https://fasttesters.com/blog/{slug}` (`SITE_URL` / `FRONTEND_URL`) |
| Tags / category | String `category`; keywords in `seoKeywords` (no Tag table) |
| Revisions | `ArticleRevision` + optional `Article.publishedAt` |
| Database | PostgreSQL (`prisma` provider) |

## Production-critical gap closures (post-audit)

| Gap | Root cause | Fix |
|-----|------------|-----|
| Rollback not idempotent | Rollback route did not use `withIdempotency` | Shared `with-idempotency.ts`; rollback accepts `Idempotency-Key`, persists/replays, `409` on key reuse with different article/revision; failed ops release reservation |
| Concurrent revision `500` | `nextRevisionNumber` = max+1 without locking | `SELECT … FOR UPDATE` on `Article` before allocate; bounded unique-conflict retry; surface remaining conflicts as HTTP `409` retryable |
| Legacy `publishedAt` null | Field added without backfill; Admin CMS never stored a publication timestamp; `createdAt` ≠ verified publish time | **Option B**: leave legacy `null`; set once on first Automation publish; updates/rollbacks do not invent `createdAt` |

## Files

Created / updated: `publish.ts`, `revisions.ts` (routes + lib), `with-idempotency.ts`, `article-fields.ts`, `public-url.ts`, migration, unit + gated integration tests, OpenAPI, `AUTOMATION_API.md`.

## Endpoints

| Method | Path | Scope | Idempotency-Key |
|--------|------|-------|-----------------|
| POST | `/api/automation/v1/blog/drafts/:id/publish` | `blog:publish` | Strongly recommended |
| PATCH | `/api/automation/v1/blog/published/:id` | `blog:update_published` | Strongly recommended |
| GET | `/api/automation/v1/blog/posts/:id` | `blog:read` | — |
| GET | `/api/automation/v1/blog/articles/:id/revisions` | `blog:revisions:read` | — |
| GET | `/api/automation/v1/blog/articles/:id/revisions/:revisionId` | `blog:revisions:read` | — |
| POST | `/api/automation/v1/blog/articles/:id/revisions/:revisionId/rollback` | `blog:rollback` | Strongly recommended |

## HTTP 409 conditions (Make.com)

- Same `Idempotency-Key` with a **different** request hash (body/params/path).
- Idempotency key still in progress (`retryable: true`).
- Stale `expected_updated_at` / concurrent published update (`retryable: true`).
- Revision unique conflict after bounded retries (`retryable: true`).

## Enable scopes

```bash
npx prisma migrate deploy   # when approving DB change — not run against production in this task
npm run automation:grant-scope -- --prefix <prefix> --scope blog:publish
npm run automation:grant-scope -- --prefix <prefix> --scope blog:update_published
npm run automation:grant-scope -- --prefix <prefix> --scope blog:revisions:read
npm run automation:grant-scope -- --prefix <prefix> --scope blog:rollback
```

## Tests

- Unit: `revisions.test.ts` (publishedAt preservation, P2002 detection).
- Gated: `AUTOMATION_PUBLISH_INTEGRATION=1` — publish/update/rollback idempotency, scope 403s, hidden 403, foreign revision 404, Admin JWT rejected, SEO-only update, concurrent updates, legacy `publishedAt` null.

## Limitations

- No separate image alt/caption fields in CMS schema (not invented).
- Migration **not** applied to production in this task (per instructions).
- No production data backfill of `publishedAt` (Option B).
- Publish integration tests gated; never run against production credentials.

## Confirmation

No Admin JWT used for Automation ops. No production migrate/deploy/publish of real articles / scope grants performed in this task.
