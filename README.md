# Swapno-AI

Swapno AI is a bilingual business workspace foundation for Bangladesh-first businesses. It includes account authentication, isolated workspaces, and a persistent Business Brain with source notes, verification status, and revision history.

## Current status

- React + Vite + TypeScript frontend and Fastify + TypeScript API, backed by Supabase Auth, PostgreSQL, and private Storage.
- English and Bangla interface, workspace creation, and Business Brain create/edit/history flows are implemented.
- Local two-user API, database, session, persistence, and Storage verification passed. See [Security verification](docs/security/SECURITY-VERIFICATION.md) for evidence and hosted-environment limits.
- Hosted Supabase foundation migrations are applied. The protected Vercel Preview runtime/browser acceptance remains pending. The `main` production-target deployment previously failed Vercel build validation because its legacy function configuration did not match a function under `api/`; the feature branch removes that invalid pattern but is not merged to `main`.
- Content drafts and revision-specific approvals are implemented on the feature branch. Their migration is not yet applied to hosted Supabase, so that module is not hosted-ready.
- A server-side OpenAI-compatible AI provider adapter is available for local 9Router integration. It is an internal library only: no user-facing AI route, automatic provider calls, customer billing, or hosted AI connection is enabled. See [AI gateway setup](docs/development/AI-GATEWAY.md).
- Subscriptions, social OAuth, publishing, and automations are not connected.

## Local development

Requirements: Node.js 26, npm, and Docker Desktop (or a compatible Docker runtime).

1. Install dependencies: `npm ci`
2. Start local Supabase: `npm run supabase:start`
3. Copy `.env.example` to `.env`. Use the local URL and publishable key printed by Supabase CLI. The file is ignored by Git. Never put a service-role key in the browser or commit secrets.
4. Start the web app and API: `npm run dev`
5. Open `http://127.0.0.1:5173`.

For local 9Router setup, see [AI gateway setup](docs/development/AI-GATEWAY.md). Use `npm run supabase:reset` to recreate the local database, then `npm run supabase:test` to run database policy tests.

## Checks

- `npm run typecheck` — TypeScript checks for API and web app.
- `npm run test` — Run API and web unit/component tests.
- `npm run test:security` — API security-boundary tests.
- `npm run test:integration` — two-user API, database RLS, session persistence, role escalation and private Storage verification (requires local Supabase and API).
- `npm run build` — production builds for both workspaces.
- `npm run supabase:test` — PostgreSQL RLS and private Storage isolation tests.
