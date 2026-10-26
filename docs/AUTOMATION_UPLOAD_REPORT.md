# Automation Image Upload — Implementation Report

## Endpoint

`POST https://webapi.fasttesters.com/api/automation/v1/uploads/image`

- Auth: `Authorization: Bearer ft_auto_…` only (Admin JWT rejected)
- Scope: `media:upload` (not in default scopes)
- Body: `multipart/form-data`, field `file`
- Storage: existing `storeUploadedFile` / R2 (`blog/` keys), public URL via `R2_PUBLIC_URL`

## Files

| Action | Path |
|--------|------|
| Created | `src/routes/automation/v1/uploads.ts` |
| Created | `src/lib/automation/image-content.ts` (+ tests) |
| Created | `src/scripts/grant-automation-scope.ts` |
| Created | `src/routes/automation/v1/uploads.test.ts` |
| Modified | `src/lib/automation/scopes.ts` (`media:upload`) |
| Modified | `src/routes/automation/v1/index.ts` |
| Modified | `src/middleware/requireAutomation.ts` (upload audit skip) |
| Modified | `docs/AUTOMATION_API.md`, OpenAPI, `MAKE_COM_INTEGRATION.md`, `package.json` |

Admin upload route and R2 client were **not** changed.

## Scope grant (Make production key)

Already applied for prefix `ft_auto_usPRENt4`:

```text
scopes: ["blog:read","blog:draft:create","blog:draft:update","media:upload"]
```

## Tests

| Suite | Result |
|-------|--------|
| `npm test` (incl. image-content) | **23/23 pass** |
| `npm run test:uploads` | **8/8 pass** |
| `tsc --noEmit` | **pass** |

## Make.com HTTP module

- Method POST, multipart, field `file`
- Header `Authorization: Bearer {{token}}`
- Map response `url` → draft `featured_image`

## Limitations

- Uploads are **not** idempotent (unique server filenames).
- Local-disk fallback URL is `/uploads/...` when R2 env is unset (production uses R2 → `assets.fasttesters.com`).
- No deploy / no Make scenario changes / no articles published.
