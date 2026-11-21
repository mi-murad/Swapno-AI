# Swapno-AI

Swapno AI is a bilingual business workspace foundation for Bangladesh-first businesses. It includes account authentication, isolated workspaces, and a persistent Business Brain with source notes, verification status, and revision history.

## Current status

- React + Vite + TypeScript frontend and Fastify + TypeScript API, backed by Supabase Auth, PostgreSQL, and private Storage.
- English and Bangla interface, workspace creation, and Business Brain create/edit/history flows are implemented.
- Local two-user API, database, session, persistence, and Storage verification passed. See [Security verification](docs/security/SECURITY-VERIFICATION.md) for evidence and hosted-environment limits.
- The hosted Supabase foundation migrations are applied. The protected Vercel Preview is build-ready, but its authenticated runtime/browser acceptance is still pending; production aliases have not been promoted.
- Content drafts and revision-specific approvals are implemented on the feature branch. Their migration is not yet applied to hosted Supabase, so that module is not hosted-ready.
- AI providers, subscriptions, social OAuth, publishing, and automations are not connected.

## Local development

Requirements: Node.js 24 or newer, npm, and Docker Desktop (or a compatible Docker runtime supported by Supabase CLI).

1. Install dependencies: `npm install`
2. Start the local Supabase stack: `npm run supabase:start`
3. Copy `.env.example` to `.env`. Use the **local** URL and publishable key printed by Supabase CLI. `.env` is ignored by Git. Never put a service-role key in the browser or commit secrets.
4. In a second terminal, start the web app and API: `npm run dev`
5. Open `http://127.0.0.1:5173`.

Supabase CLI applies `supabase/migrations/` during startup/reset. Use `npm run supabase:reset` to recreate the local database, then `npm run supabase:test` to run database policy tests. For credentials and email settings, see [Local setup](docs/development/LOCAL-SETUP.md).

## Checks

- `npm run typecheck` — TypeScript checks for API and web app.
- `npm run test` — API and web unit/component tests.
- `npm run test:security` — API security-boundary tests.
- `npm run test:integration` — two-user API, database RLS, session persistence, role escalation, and private Storage verification (requires local Supabase and the API running).
- `npm run build` — production builds for both workspaces.
- `npm run supabase:test` — PostgreSQL RLS and private storage isolation tests (requires local Supabase).

Implementation details and current verification evidence are in [Security verification](docs/security/SECURITY-VERIFICATION.md).
