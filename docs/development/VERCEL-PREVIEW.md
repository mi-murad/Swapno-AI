# Vercel Preview deployment

## Authentication origin allowlist

The API validates the browser `Origin` header on every mutating `/api/*` request. Do not disable this check and do not use wildcard origins.

- The current Vercel deployment hostname is added automatically from `VERCEL_URL`.
- Set the Preview environment variable `WEB_ORIGINS` to any stable Preview alias that users actually open, for example `https://your-preview-alias.vercel.app`.
- Multiple exact origins may be separated by commas. Include only domains controlled by this project.
- Production and Preview environment variables are separate. Configure and verify each environment independently before enabling sign-in there.
- Non-local origins must use HTTPS. Paths, query strings, credentials, wildcard domains, and plain HTTP public hosts are rejected.
- The legacy `WEB_ORIGIN` single-origin setting remains supported for compatibility; prefer `WEB_ORIGINS`.

After changing Vercel environment variables, create a new deployment so the server receives the updated configuration. Keep Vercel Authentication/SSO enabled while testing protected previews.

## Preview acceptance checklist

1. Open the exact Preview alias configured in `WEB_ORIGINS`, or the deployment-specific URL shown by Vercel.
2. Confirm the sign-in page loads behind the expected Vercel SSO gate.
3. Register a test account in the matching Supabase Preview project. If email confirmation is enabled, complete the email confirmation first.
4. Sign in and verify the browser receives HttpOnly session cookies.
5. Refresh the page and confirm the session is recovered.
6. Create a workspace, add Business Brain details, save, sign out, sign back in, and verify persistence.
7. Confirm a request from an unlisted origin receives HTTP 403.
8. Do not use production customer data or disable SSO to complete Preview testing.

A successful Vercel build is not proof of hosted authentication, database isolation, or browser acceptance. Record those checks separately.
