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

1. Confirm the deployment has Vercel Authentication / Preview protection enabled.
2. Confirm `/` and a direct SPA deep link load the frontend, and `/health` returns the API health response.
3. Register and sign in using the hosted Auth configuration; verify cookies are `HttpOnly`, `Secure`, and `SameSite=Strict`.
4. Create separate test users/workspaces and repeat the database/API/Storage isolation checks against the hosted project. Clean up test accounts and rows afterward.
5. Verify browser assets and API responses contain no credentials or auth tokens.

This setup is Preview-only. Do not promote or alias a production domain until the hosted two-user verification and browser checks pass.
