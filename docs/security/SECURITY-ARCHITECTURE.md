# Swapno AI Security Architecture

**Status:** Initial security controls implemented for the local foundation; see [Security verification](SECURITY-VERIFICATION.md) for evidence and unverified checks.
**Review date:** 16 November 2026
**Scope:** Product security requirements for the proposed modular monolith, workers, data stores, AI gateway, and social integrations.

This document translates the approved product blueprint into controls to design, implement, and verify. It is not a security certification. Threat modeling and implementation review are required before customer data or live integrations are introduced.

## Security boundaries

1. **Identity:** Authenticate a person using an established auth lifecycle. Do not trust a browser supplied user, role, workspace, account, or client identifier.
2. **Workspace authorization:** Every read, write, file operation, AI task, export, and external action must resolve the actor's current workspace membership and capability on the server. A user may belong to several workspaces.
3. **Tenant isolation:** Every tenant-owned record is workspace-scoped. If PostgreSQL RLS is selected, policies enforce membership using trusted identity claims and least-privilege database roles. Application checks and RLS are complementary. Test with separate users and negative cross-workspace cases.
4. **Agency/client model:** Agencies receive access only after an authorized client invitation or explicit grant. Scope permissions to workspace and action; record grant, change, and revocation. Client shares are separate, read-only, narrow, expiring, and revocable.
5. **Trust zones:** Browser, API, worker, database, private object storage, AI/model providers, and social platforms are distinct boundaries. Service-to-service credentials stay server-side and are narrowly scoped.

## Data handling

- Classify data before ingestion: public source, workspace business data, personal data, credentials/tokens, and platform analytics. Collect only what the active workflow needs.
- Persist Business Brain facts with source, time observed, author, confidence/status, and version. Distinguish user-confirmed facts from imported content, estimates, and AI suggestions. Never silently promote an AI inference to confirmed truth.
- Keep source files and generated assets in private storage. Authorize each download against current workspace membership; use short-lived links when needed. Validate file size/type, scan where practical, and store outside executable paths.
- Define retention, export, deletion, backup, recovery, and audit retention before launch. Deleting a workspace must account for queued tasks, provider copies, OAuth grants, files, and shared links.
- Avoid storing sensitive content in logs, analytics, error traces, or queue payloads. Prefer opaque record IDs and minimized payloads.

## Credentials and integrations

- Keep provider keys, OAuth client secrets, refresh/access tokens, database owner/service-role keys, and signing keys out of source, browser bundles, URLs, analytics, and logs. Use an approved server-side secret manager or protected environment; rotate and revoke credentials.
- Implement official OAuth consent with minimum scopes, state/CSRF validation, exact redirect URI checks, encrypted-at-rest tokens, refresh/revocation handling, connection ownership, and a visible disconnect action. Never request permissions without the relevant feature and user consent.
- Separate read scopes from write scopes. Default connectors to read-only where possible. Social publishing, ad creation, budget changes, and other consequential side effects require a version-specific approval record and a server-side execution check.
- Persist an idempotency key, intent, approval version, actor, workspace, target platform/account, and result before/after external calls. Reconcile ambiguous timeouts against the remote platform before retrying. Do not claim success without a verified platform response/remote ID.

## AI data and output controls

- Use a provider-neutral server-side gateway with an allowlisted model registry. Attach workspace context only after authorization; do not share prompts, retrieval indexes, or cached results across tenants.
- Before sending workspace content to a provider, show/use a reviewed data policy covering provider/subprocessor, retention/training terms, region, and the selected model's current behavior. Provider routing does not remove the downstream provider's data terms.
- Treat retrieved pages, uploads, and model output as untrusted input. Apply prompt-injection defenses, output validation, tool allowlists, and server-side authorization to every proposed action.
- Apply per-workspace and per-user quotas, cost budgets, concurrency limits, timeout limits, and usage records. No silent fallback to another paid model or provider.
- Label generated or estimated information and require a human to confirm important Business Brain facts. Track model/provider/version and source references for reproducibility.

## API, jobs, and abuse controls

- Validate request schemas, content type, size, and identifiers at the boundary. Use secure cookies/session protections where applicable, CSRF protections for cookie-authenticated mutations, CORS allowlists, and safe error messages.
- Rate limit auth, upload, search, generation, export, and social endpoints. Add abuse monitoring and account/workspace-level ceilings before public access.
- Queue only authorized, versioned work. A worker rechecks membership, approval, target, and current record version before side effects. Use bounded retries, backoff, visibility timeouts, dead-letter/recovery handling, and idempotency.
- Keep privileged database roles and queue dequeue/administration actions worker-only. Do not expose service roles or unrestricted queue functions to browser clients.
- Record audit events for auth changes, membership/role changes, secret/OAuth lifecycle, data export/deletion, approvals, and external actions. Restrict audit access and prevent ordinary users from editing history.

## Required verification before live data

- Unit and integration tests for authorization and negative cross-tenant access across API, database/RLS, storage, AI retrieval, exports, queues, and audit records.
- OAuth state, scope, token encryption, revocation, expiry, and reconnect tests with platform sandbox/test accounts.
- Approval bypass, stale approval/version, duplicate job, timeout/retry, cancellation, and remote-uncertain-result tests.
- Secret/log scan, dependency and static security checks, upload validation, rate-limit checks, secure headers, and backup restore exercise.
- Threat model covering account takeover, cross-tenant disclosure, prompt injection, SSRF/file ingestion, leaked credentials, malicious agency access, replay/duplicate publishing, and denial-of-wallet.
- Accessibility and privacy review of permission prompts, consent, account disconnect, export/delete, and client share controls.

## Approval gates and current state

The initial local implementation uses Supabase Auth, PostgreSQL RLS, and private Storage policies. Local migrations and two-user tests are authored but not yet executed because this Windows environment lacks a Docker-compatible runtime/PostgreSQL. No cloud project, AI provider, OAuth app, social account, deployment, or production secret was connected. Security controls beyond the initial authentication/workspace/Business Brain scope remain future work.

## First-party references

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase product security](https://supabase.com/docs/guides/security/product-security)
- [Supabase Queues quickstart and access guidance](https://supabase.com/docs/guides/queues/quickstart)
- [OpenRouter provider data practices](https://openrouter.ai/privacy)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
