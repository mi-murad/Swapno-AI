# Local setup

## Requirements

- Node.js 24 or newer and npm.
- Docker Desktop, Podman, or another Docker-compatible runtime supported by Supabase CLI on Windows.
- Ports 5173, 3001, and the default local Supabase ports available.

## Start the application

1. Run `npm install` in the repository root.
2. Run `npm run supabase:start`. The first start downloads Supabase container images and can take several minutes.
3. Copy `.env.example` to `.env`. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the local values printed by the CLI. Use only the local publishable key here. The API uses that same public key with the signed-in user's access token; it has no service-role key.
4. Run `npm run dev` in the repository root.
5. Browse to `http://127.0.0.1:5173`.

To recreate the local database and apply migrations, run `npm run supabase:reset`. To execute the database policy suite, run `npm run supabase:test`.

## Two-user integration verification

After Supabase is running and the root `.env` has local values, start the API in one terminal with `npm run dev`. In another terminal, run `npm run test:integration`. The suite registers two disposable local users through the API, then verifies API behavior, user-scoped database RLS, membership-role escalation denial, profile revisions across sign-out/sign-in, and private Storage upload/download. It creates disposable rows and objects; reset the local database with `npm run supabase:reset` after verification if you want a clean local state. It refuses any non-local Supabase URL.

## Email confirmation

The checked-in local Supabase configuration disables email confirmation so local registration can create a session without an external mail service. This is a local-development setting, not a production authentication recommendation. Before any hosted environment is connected, configure and verify its email confirmation and recovery flows.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Fastify API and Vite web app |
| `npm run typecheck` | Type check both workspaces |
| `npm run test` | Run API and frontend unit/component tests |
| `npm run test:security` | Run API cookie, auth-boundary, and origin checks |
| `npm run build` | Build API and static web app |
| `npm run supabase:start` | Start local Supabase containers |
| `npm run supabase:reset` | Reset database and reapply migrations |
| `npm run supabase:test` | Run SQL RLS and Storage tests |

## Troubleshooting

- If Supabase CLI reports that Docker is unavailable, install and start a Docker-compatible runtime, then retry. The Windows native Supabase stack is not currently the supported local route for this setup.
- If the web app loads but API calls fail, confirm Supabase is running and `.env` contains the local URL and publishable key.
- A browser refresh should retain language and selected workspace preferences. Auth tokens are held in `HttpOnly` cookies; profile and workspace data are loaded again from the API.
- Do not add `.env` to Git. Do not use a service-role key in the web app.
