# Automation API — Production Hardening Report

Date: 2026-10-24  
Scope: `/api/automation/v1` only  
**No articles were published. Admin and public blog routes were not modified. No deploy was performed.**

---

## Changes made

### P0 — Idempotency concurrency
- Replaced check-then-store with **atomic reservation** via unique `(apiKeyId, key)` insert (`responseCode = 0` = pending).
- Losers **poll** until the winner completes, then return the stored response (`Idempotency-Replayed: true`).
- Failures **release** pending reservations; stale pending rows (>60s) are reclaimable.
- Request body hash is compared on replay; mismatched body → `409`.
- Article `slug` races handled via Prisma `P2002` → `409`.

### P0 — Production configuration
- Production hostname identified from frontend: **`https://webapi.fasttesters.com`** (HTTPS `/health` → 200).
- Removed placeholder `api.fasttesters.com` from OpenAPI + Make docs.
- Documented create/revoke key flows; scripts avoid dumping full error objects (secrets).
- Auth middleware no longer logs tokens; draft errors log `error.message` only.

### P1 — Featured image validation
- HTTPS only; rejects `javascript:`, `data:`, `http:`, FTP, etc.
- Rejects localhost / private / reserved hosts (even though the API only stores the URL).

### P1 — Integration coverage
- Make-style workflow: list → duplicate check → POST → GET → public isolation.
- 10 concurrent identical `Idempotency-Key` → exactly one article.
- Concurrent different keys / same slug → exactly one article.
- Partial PATCH + publish block + unsafe image rejection.

### P2 — Rate limiting evaluation (no Redis added)
| Option | Fit for current deploy |
|--------|-------------------------|
| In-memory (current) | **Adequate** for single Render web service (`fasttesters-api`) |
| Postgres counter table | Good if/when scaling to multiple instances without Redis |
| Redis / Upstash | Justified only after horizontal scale or multi-region |

**Decision:** Keep in-memory; document scale-out path. Also capped Prisma `connection_limit=5` against Supabase session pooler exhaustion under concurrency.

---

## Test results

| Suite | Result |
|-------|--------|
| Unit (`npm test`) | **14/14 pass** |
| Integration (`AUTOMATION_INTEGRATION=1`) | **14/14 pass** |
| Prod HTTPS health | `https://webapi.fasttesters.com/health` → **200** `{"status":"ok"}` |

---

## Remaining security risks

1. **In-memory rate limits** are per-process (weak if multiple instances).
2. **Featured images are not fetched** by the API — validation blocks dangerous schemes/hosts, but a public HTTPS URL could still point at abusive content (editorial review remains required).
3. **Deploy lag:** production runtime may not yet include this hardening until the next backend deploy (out of scope here).
4. **Session pooler size:** concurrent Make bursts can still stress small Supabase pools; retries with the same Idempotency-Key are safe.

---

## Production deployment checklist

1. Deploy backend build that includes automation + hardening (no content publish).
2. Confirm `GET https://webapi.fasttesters.com/api/automation/v1/health`.
3. Confirm `GET https://webapi.fasttesters.com/api/automation/v1/openapi.json` shows `webapi.fasttesters.com`.
4. `npm run automation:create-key -- --name "Make.com Production"` — store token **only** in Make vault.
5. Configure Make base URL: `https://webapi.fasttesters.com/api/automation/v1`.
6. Always send `Idempotency-Key` = scenario execution id on POST drafts.
7. Smoke: create disposable draft → verify absent from public `/api/articles` → delete in Admin.
8. Rotate/revoke keys with `npm run automation:revoke-key`.

---

## Explicit confirmation

- **No content was published** during this work.
- **No Admin or public blog behavior changes.**
- **No schema migration** was required for hardening (pending marker uses existing columns).
- Temporary test drafts created during integration tests were deleted in test teardown.
