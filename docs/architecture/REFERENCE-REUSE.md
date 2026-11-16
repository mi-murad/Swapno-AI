# Reference and Reuse Register
**Status:** Assessment for review; no reference code has been copied.
**Scope:** Public reference repositories reviewed for Swapno AI foundation planning.

## Current project baseline

The new repository is a clean TypeScript-first starting point on `main`. It currently contains its original README and the approved empty directory skeleton. There is no framework, application code, package manifest, database, or test suite to preserve.

The product blueprint approves a modular monolith with clear web, API, shared-package, worker, database, documentation, and test boundaries. It leaves the concrete frameworks and managed services open for a researched recommendation.

## Reuse decisions

| Reference area | Potential value | Current status and reuse guard |
|---|---|---|
| Previous SwapnoAI React/Vite UI | Navigation, dashboard composition, visual patterns, and component ideas | **Design reference only.** The implementation audit says many screens are backed by sample state. Review component source and dependencies before adapting individual UI pieces. |
| Previous SwapnoAI domain concepts | Account/workspace, Business Brain, research, content, and campaign concepts | **Requirements reference.** Re-model against the approved workspace boundary and provenance rules; do not copy sample records or treat existing domain types as final. |
| Previous SwapnoAI auth/workspace scaffolding | Route boundaries, request validation patterns, and membership checks | **Do not reuse as production auth.** It uses custom JWT auth and local JSON persistence; lifecycle features and database-enforced tenancy were not verified. |
| Previous SwapnoAI AI provider code | Provider interface and explicit connection-test patterns | **Interface ideas only.** The adapters are connection tests, not a generation router. The audit reports mocked tests and no live provider verification. Do not copy legacy hard-coded model/fallback behavior. |
| Previous SwapnoAI tests and migration | Test cases, SQL entity ideas, and migration structure | **Review individually before adaptation.** Existing tenant tests cover local JSON, not Postgres RLS. The migration was not executed against an authorized staging database. |
| SwapnoAI-automation campaign policy/schema | BDT budget validation, campaign/product/destination concepts, approval records, and audit ideas | **Selective domain reference.** Verify constraints, ownership, RLS, and idempotency. The Python schema and service code are not a TypeScript implementation to copy wholesale. |
| SwapnoAI-automation workflow files | Campaign draft and approval workflow shape | **Workflow reference only.** The included n8n workflow is inactive. Its existence does not demonstrate execution, durable approvals, or safe retries. |
| SwapnoAI-automation Meta adapter | Integration boundary placeholder | **Not reusable implementation.** The inspected methods raise NotImplementedError; account insights and campaign creation are explicitly unconfigured. |

## Findings that affect reuse

The previous SwapnoAI implementation audit identifies these prototype behaviors: sample workspace switching; simulated publishing and Meta connection; demo analytics; export/PDF flows; mock timers and canned AI output. It also reports local JSON persistence, disabled production/demo APIs, incomplete authentication lifecycle, and no verified production tenant isolation.

The automation reference README labels its dashboard demo mode: browser-memory sample data resets on refresh, no accounts are connected, and no advertisements are published. Its backend campaign draft uses template copy and marks it as not AI generated. The Meta adapter is intentionally disabled. Its static bearer token is an internal request gate, not user or workspace authorization.

## Reuse gate

Before adapting any file or schema, record:

1. Source path and commit/ref.
2. Intended behavior and actual runtime behavior.
3. Dependencies and license.
4. Mocked, local-only, test-connected, or live-verified status.
5. Workspace and user authorization checks.
6. Secret handling and external side effects.
7. Changes needed for Swapno AI contracts.
8. Tests that prove the adapted behavior.

Do not reuse a component if its data ownership, security behavior, license, or external effect cannot be established. Keep reference code in its source repository unless an approved, reviewed adaptation is made here.

## Blueprint requirements that constrain future reuse

- Treat the Business Brain as persistent, versioned workspace knowledge, not as a prompt assembled from browser state. Preserve source provenance and distinguish user-confirmed facts, imported evidence, estimates, and AI-generated suggestions.
- Support self-service workspaces and explicitly granted agency/client memberships through the same authorization model. Agency access is never implied by a client relationship.
- Do not adapt local JSON persistence, mock timers, sample providers, disabled integrations, or demo UI as production implementations. A screen that resembles a live operation is not evidence that an external action occurred.
- Any adapted integration must preserve platform-specific scopes, consent, review, revocation, rate limits, idempotency, and verified external-result IDs. Treat account and provider eligibility as user- and app-specific.
- Evaluate the actual UI workflow and documentation alongside code: empty states, progress, review, version history, permission explanation, mobile approval, Bangla text and date handling, and error recovery all matter to reuse.

The active public reference repositories were checked again on 16 November 2026. Both are public; the earlier SwapnoAI implementation audit remains the basis for mock/persistence/security cautions, and the automation README explicitly describes its dashboard as in-memory demo data with no connected accounts or ad publishing. Repository metadata alone does not certify its code, license, or runtime behavior. Re-review the exact source revision and license before copying anything.

## Sources reviewed

- [Previous SwapnoAI implementation audit](https://github.com/mi-murad/SwapnoAI/blob/main/docs/foundation/14-IMPLEMENTATION-AUDIT.md)
- [Previous SwapnoAI architecture](https://github.com/mi-murad/SwapnoAI/blob/main/docs/ARCHITECTURE.md)
- [Previous SwapnoAI project status](https://github.com/mi-murad/SwapnoAI/blob/main/docs/PROJECT-STATUS.md)
- [Previous SwapnoAI AI provider matrix](https://github.com/mi-murad/SwapnoAI/blob/main/docs/AI-PROVIDER-MATRIX.md)
- [SwapnoAI-automation README](https://github.com/mi-murad/SwapnoAI-automation/blob/main/README.md)
- [SwapnoAI-automation campaign backend](https://github.com/mi-murad/SwapnoAI-automation/blob/main/backend/app/main.py)
- [SwapnoAI-automation Meta adapter](https://github.com/mi-murad/SwapnoAI-automation/blob/main/backend/app/integrations/meta.py)
- [SwapnoAI-automation schema](https://github.com/mi-murad/SwapnoAI-automation/blob/main/database/schema.sql)
- [SwapnoAI-automation workflow](https://github.com/mi-murad/SwapnoAI-automation/blob/main/automation/workflows/campaign-draft-approval.json)
