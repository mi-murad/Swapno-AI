# Protected Vercel Preview

The application uses one Fastify deployment to serve both the API and the built Vite frontend. The browser calls `/api` on the same origin, so the `HttpOnly`, `SameSite=Strict` session cookies do not cross domains.

## Vercel build configuration

- Framework preset: Fastify
- Root directory: repository root
- Install command: `npm ci`
- Build command: `npm run build`
- Node.js: 24 or later
- Vercel detects the root `server.ts` Fastify entrypoint. The static app is built into `apps/web/dist` by the repository build command.
- The Vercel `VERCEL_URL` system variable supplies the exact Preview origin for API mutation checks. `WEB_ORIGIN` is optional and should be unset unless an explicit origin is required.

## Preview environment variables

Set these as encrypted **Preview-only** project variables. They are read by the server process and are not prefixed with `VITE_` or included in browser assets:

```dotenv
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
```

The publishable key is not an authorization secret; RLS and the signed-in user's access token enforce database access. Do not configure a service-role key, AI-provider key, or other privileged credential for this foundation Preview. `.env.example` contains local placeholders only; never commit a populated `.env` file.

## Preview acceptance checks

1. **PASS:** Vercel Authentication / SSO Preview protection is enabled. Unauthenticated GET requests to `/` and `/health` returned `302` protection responses.
2. **PENDING:** Verify `/`, a direct SPA deep link, and `/health` after authenticated access. The authenticated Vercel fetch helper did not return, and the local Vercel CLI is unavailable.
3. **PENDING:** Register/sign in against hosted Auth and verify `HttpOnly`, `Secure`, and `SameSite=Strict` cookies.
4. **PARTIAL:** A rollback-only hosted SQL simulation passed workspace and Storage metadata RLS checks under two authenticated database identities. Real hosted users, API isolation, persisted revisions, and private file-byte access still need end-to-end tests.
5. **PARTIAL:** The local browser bundle contains no Supabase URL/key markers; deployed browser assets and API responses have not been inspected behind SSO.

This setup is Preview-only. Do not promote or alias a production domain until the hosted two-user verification and browser checks pass.
