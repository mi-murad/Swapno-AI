# Security verification

**Status:** Local foundation security verification passed on 16 November 2026. Hosted Supabase migrations and permission remediation are applied and catalog/advisor checks are clean. Hosted two-user authentication and Vercel Preview behavior remain to be verified.

## Controls verified

- Auth endpoints return user details only. Supabase access and refresh tokens are set as `HttpOnly`, `SameSite=Strict` cookies and are absent from auth response JSON. Production cookies use `Secure`.
- Authenticated identity is verified by Supabase Auth on the server. Expired access sessions are refreshed server-side.
- The API creates Supabase clients scoped to the verified user's bearer token. No service-role key is used by the API or browser. The local `.env` contains only the local Supabase URL, the local publishable key, and app settings; `.env.example` contains placeholders.
- Mutating `/api/` requests require the configured web Origin. Fastify applies security headers, request-size limits, and rate limits.
- Workspace, membership, Business Brain, revision, and Storage policies were exercised using two distinct users and workspaces. Each user's authenticated database client saw only its own workspace and records. Cross-workspace database writes, membership claims, role changes, and Storage access were rejected.
- Authenticated users have `SELECT` and a policy-constrained owner-membership `INSERT` path on `workspace_members`; they cannot directly change membership roles. Workspace creation uses the authenticated caller's `auth.uid()`.
- Business Brain profile writes cannot set ownership or revision metadata directly. A database trigger records revision snapshots.

## Security-definer functions

The local and hosted catalogs were queried after applying the migrations:

| Function | Owner | `search_path` | Execution ACL | Purpose |
| --- | --- | --- | --- | --- |
| `public.create_workspace(text)` | `postgres` | empty | `authenticated` only | `SECURITY INVOKER`; atomically creates a workspace and its caller's owner membership under table grants and RLS. |
| `private.is_workspace_creator(uuid)` | `postgres` | empty | `authenticated` only | `SECURITY DEFINER`; policy helper checks only whether `auth.uid()` created the supplied workspace. It accepts no caller-supplied user ID. The `private` schema is not exposed by PostgREST. |
| `private.capture_business_brain_revision()` | `postgres` | empty | `postgres` only | Trigger-only revision snapshot capture. |

The first local and hosted policy design had recursive RLS checks. The final design keeps `public.create_workspace` as `SECURITY INVOKER`; the private helper narrowly breaks the recursion by checking the caller against the workspace creator under its fixed empty `search_path`. The helper is not exposed as a PostgREST RPC. Future membership invitations or role assignment need a separate, reviewed permission path.

The hosted project also contains the pre-existing `public.rls_auto_enable()` event-trigger function. It remains owned by `postgres`, has `search_path=pg_catalog`, and is still attached to the enabled `ensure_rls` DDL event trigger. The foundation migration revoked `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`; its hosted ACL is limited to `postgres` and `service_role`. The trigger continued to operate while the migration created the RLS-protected tables. The hosted security advisor now reports no findings.

## Test evidence

Verified against local Supabase (127.0.0.1):

- `npm run supabase:test`: **PASS**, `workspace_isolation_test.sql`, 9/9 pgTAP assertions.
- `npm run test:integration`: **PASS**, 5/5 Node test cases. The test registered two independent users, created separate workspaces, and exercised API isolation, database RLS, role and membership restrictions, real private Storage upload/download, access/refresh cookies, logout, re-login, and Business Brain revision persistence.
- API unit/security tests: **PASS**, 9/9; web tests: **PASS**, 2/2.
- API and web typechecks: **PASS**.
- API and web production builds: **PASS**.
- Supabase security advisors: **PASS**, no issues found.
- Supabase schema lint (`public`, `private`): **PASS**, no schema errors.
- Local security advisors and schema lint: **PASS**, no issues or schema errors.
- Local Vercel-mode HTTP smoke check: **PASS** for SPA root, Vite JavaScript asset, deep-link fallback, API health, and JSON 404 for an unknown API route.
- Catalog inspection confirmed the definer functions are owned by `postgres`, use an empty `search_path`, and have the restricted execution ACLs shown above.
- Auth JSON token non-disclosure and cookie flags were checked by unit and integration tests. Web source and built configuration contain no Supabase URL/key references; the browser talks to the API same-origin. The publishable key is kept server-side in this architecture and is not a secret credential.

The hosted project now records both foundation migrations, has the four expected public tables, and retains the enabled `ensure_rls` trigger. Its Supabase security advisor returned no findings after the permission remediation. No hosted Auth users or integration-test data have been created yet.

## Limits and remaining requirements

- Local two-user tests do not establish hosted Auth or RLS behavior. Hosted migrations, function ACLs, table presence, and advisor state were inspected, but real hosted user registration, workspace isolation, Storage, and persistence tests have not run.
- The protected Vercel Preview has not deployed yet. Preview environment variables and browser flows still need verification.
- Role verification establishes that clients cannot claim or mutate membership/roles. There is no invitation flow and no differentiated `admin` versus `member` capability model yet; those product semantics remain open.
- No browser automation was run. Language switching is covered by frontend unit tests, not a manual browser acceptance check.
- No live provider, AI, social OAuth, automation, subscription, or publishing integration was tested.
- Hosted Supabase was changed only as approved: the two foundation migrations were applied, and the existing public helper's external execution grants were revoked while keeping its event trigger active. No Vercel project or repository setting has been changed, and no commit, push, or production deployment has occurred yet.
