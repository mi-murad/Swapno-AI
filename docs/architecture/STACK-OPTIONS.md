# Stack Options for Approval
**Status:** Initial stack approved and implemented locally; provider recommendations outside that scope remain research only.
**Decision principle:** Keep the approved TypeScript modular monolith. Select only the smallest set of services needed for the first verified user workflow. Recheck plan limits and pricing before creating accounts or enabling paid usage.

## Current recommendation

For review, the simplest fit appears to be a React web client, a separately bounded TypeScript API, PostgreSQL with managed authentication and row-level tenant protections, a small durable worker queue, and provider adapters behind explicit user/workspace cost controls.

The initial React/Vite, Fastify, PostgreSQL, and Supabase choices have been approved for the foundation. This does not authorize provisioning hosted services or spending money.

## Decisions

| Decision | Practical options | Advantages and tradeoffs | Recommendation for review |
|---|---|---|---|
| Web framework | React + Vite SPA; Next.js App Router | Vite keeps an interactive dashboard simple and can emit static assets. Next adds server rendering and server-side code patterns, useful for public SEO pages, but adds framework concepts and ties some server behavior to the frontend runtime. | **React + Vite for the authenticated workspace**, if public marketing pages can be static or separate. Choose Next only if server-rendered public pages are a core launch requirement. |
| API framework | Express 5; Fastify; NestJS | Express has a familiar minimal core and prior reference patterns, but modularity and validation must be enforced by project structure. Fastify provides schema-based validation/serialization and plugin boundaries, with some additional conventions. Nest provides stronger structure but adds more framework surface. | **Fastify for review** because the new API is greenfield and the product needs explicit request/response contracts. Keep modules independent of framework; approve before scaffolding. |
| Database and authentication | Supabase Postgres + Supabase Auth; managed Postgres with a separate auth service | Supabase bundles database, Auth, RLS, Storage, and queues with a low-ops path. Separate providers offer more component choice but add integration, billing, and operational work. RLS still requires careful policy design and testing. | **Evaluate Supabase first** for a low-ops pilot, conditional on two-user workspace isolation tests and no service-role access from the browser. The prior project’s Supabase work does not count as verified persistence or RLS. |
| File/media storage | Supabase Storage; S3-compatible object storage | Supabase Storage integrates with Postgres RLS and lowers service count. S3-compatible storage is portable and widely supported, but needs its own access policy, credential, and lifecycle work. | **Start with one storage service only when ingestion is implemented.** If Supabase is selected, trial its Storage with private buckets and workspace-scoped policies. |
| Background jobs | Supabase Queues/pgmq; Redis + BullMQ worker; managed workflow service | Postgres-backed queues avoid adding Redis and fit the modular monolith. Redis/BullMQ can suit higher throughput and independent worker scaling but introduces another service and cost. A workflow service adds stronger orchestration but can be premature. | **Begin with a durable Postgres-backed queue and separate worker process** if Supabase/Postgres is selected. Make handlers idempotent; queue semantics do not replace approval records or execution history. |
| AI gateway/provider | Direct provider adapter(s); AI SDK/provider gateway | Direct adapters keep vendor, privacy, and cost choices explicit but require us to maintain routing and usage records. A gateway simplifies model switching and routing but adds a vendor layer, data path, and potentially separate usage billing. | **Build a small internal provider interface; enable no provider by default.** Add one provider only after the user approves its price, privacy terms, and key handling. No silent paid fallback. |
| Vector retrieval | Postgres pgvector; dedicated vector database; defer | pgvector keeps embeddings beside workspace records and can use the same access boundaries. A separate vector service may help at larger scale but adds cost and another tenant-isolation surface. | **Defer vector storage until retrieval needs are measured.** If needed initially, evaluate pgvector before a separate service. |
| Workflow engine | Small in-app workflow/state machine; n8n; dedicated durable workflow engine | In-app workflows preserve product-specific approvals and reduce operational components. n8n is useful for integration experiments but needs independent auth, secrets, execution monitoring, and versioned workflow control. Durable workflow engines help complex long-running runs but add adoption cost. | **Use a small typed in-app workflow model for the first approved flows.** Keep n8n as an optional internal prototype tool, not the source of truth for user approvals. |
| Notifications | In-app notification records; transactional email provider; SMS/WhatsApp | In-app notices avoid external messaging setup. Email is useful for approvals and status but has deliverability, sender-domain, and usage costs. SMS/WhatsApp add provider fees and consent requirements. | **Start with in-app notifications.** Add email only when a user workflow needs it and an approved provider and sender setup are selected. |
| Hosting | Static web + persistent API/worker host; all-in-one application host; serverless functions | Static hosting can be inexpensive for the web client. Persistent workers suit queues and long-running jobs. Serverless functions scale automatically but have duration, payload, and usage limits that must fit the task. | **Do not choose a host yet.** First establish the local web/API/worker contract. For deployment evaluation, compare total cost, region latency, persistent-worker support, logs, backups, and hard spend limits. |
| Billing | Stripe; Bangladesh-capable regional payment provider; defer | Billing ties to merchant-country eligibility, settlement, tax, refunds, and subscription operations. Stripe’s published supported-country list did not show Bangladesh when checked; this must be revalidated before any decision. A local/regional provider may fit settlement better but needs separate recurring-payment and API review. | **Defer billing.** Validate the business model and merchant eligibility before integrating any payment provider. |
| Meta integration | Official Marketing API; read-only reports first; manual import | The official API supports campaign and insights operations, but access permissions, app review, account ownership, rate limits, and changing API versions apply. Manual imports are limited but avoid early OAuth risk. | **Start with read-only access only after integration approval.** Keep campaign creation and budget changes disabled until the approval flow, idempotency, and live response verification are tested. |

## Cost and security notes

- Supabase currently advertises a Free plan for experiments and a Pro plan starting at $25/month; included quotas and add-ons change. Free projects can pause after inactivity and do not include some production protections. Verify current pricing before any provisioning. [Supabase pricing](https://supabase.com/pricing)
- Supabase requires RLS on exposed tables and policies that enforce actual ownership or workspace membership; authentication alone is not tenant authorization. Test policies with separate users. [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Supabase Queues is currently labeled **Public Alpha** by Supabase and is a pull-based Postgres/pgmq queue. It may reduce service count for an evaluated pilot, but alpha status and delivery semantics make it a conditional candidate, not an approved production dependency. Keep a server-side worker, explicit visibility-timeout/retry handling, idempotent job records, dead-letter/recovery procedures, and approval gates; queue delivery semantics do not make external social/ad actions exactly-once. Recheck stage and limits before selection. [Supabase Queues stage](https://supabase.com/features/queues), [Queues quickstart](https://supabase.com/docs/guides/queues/quickstart), [pgmq behavior](https://supabase.com/docs/guides/queues/pgmq)
- Vercel Functions have runtime and payload limits and usage-based pricing; Render background workers run continuously and commonly poll a queue. Compare these against the actual long-running research/media tasks before hosting selection. [Vercel Function limits](https://vercel.com/docs/functions/limitations), [Render background workers](https://render.com/docs/background-workers), [Render pricing](https://render.com/pricing)
- AI model availability, provider retention terms, and price can change. The previous provider matrix itself says the old adapters are tests and no provider is live-verified. No key or model should be configured until the user approves the provider and budget.
- Do not put Supabase service-role credentials or any provider secret into browser-visible configuration. [Supabase security guide](https://supabase.com/docs/guides/security/product-security)
- The Stripe country list is a screening signal only, not legal or payments advice. Check current merchant eligibility and local payment options before adding subscriptions. [Stripe global availability](https://stripe.com/global)
- Meta campaign writes can spend real money. The official Marketing API documentation should be rechecked for current version, permissions, and app review before implementation. [Meta Marketing API](https://developers.facebook.com/documentation/ads-commerce/marketing-api)

## Suggested decision order

1. Confirm the web rendering requirement: authenticated dashboard only, or public SEO pages in the same app.
2. Approve API framework and shared contract/validation approach.
3. Decide whether Supabase is acceptable for a staging-only proof of auth, PostgreSQL persistence, and two-user RLS isolation.
4. Define the first workflow and its persistence/job needs before selecting a queue.
5. Approve one AI provider and a spending/privacy policy before any live provider call.
6. Revisit hosting, billing, social OAuth, and ad publishing only when their phase is ready.

## Additional requirements from the complete product instruction

The preferred first user workflow is: create an account and workspace → collect a small business profile and source material → review/confirm extracted Business Brain facts → create and revise a content or campaign draft → inspect the exact version and approve it for a later, explicitly enabled action. Start with a persisted draft and no external publishing. This exposes auth, tenant isolation, history, provenance, bilingual UX, and approval boundaries before adding irreversible integrations.

Keep the service interfaces provider-neutral. Evaluate one text model and one image model using Swapno-specific Bangla and Bangladesh ecommerce tasks before recommending a live provider. OpenRouter can reduce adapter work but introduces an additional data processor and routing layer; direct provider APIs make data terms and billing paths more direct but require more adapter work. Neither is selected. Model names, retention terms, regional handling, eligibility, quotas, and prices must be checked immediately before any credential or live-call approval.

For Supabase staging evaluation, prove two-user workspace isolation at the database policy layer, private file access, backup/restore expectations, server-only privileged credentials, and queue retry/recovery behavior before treating it as a production choice. Do not expose queue operations or privileged roles to browser clients.

The current complete product phases are: foundation/auth/workspaces and bilingual shell; Business Brain and knowledge/history; AI gateway and usage controls; research/strategy; content and creative approvals; social integrations; ads/analytics; automation/client sharing; then production readiness. Build vertical slices with explicitly labeled mock, disconnected, test-connected, live-verified, and production-ready states. The detailed AI and social evaluation criteria are in [MODEL-EVALUATION.md](MODEL-EVALUATION.md) and [SOCIAL-INTEGRATION-MATRIX.md](SOCIAL-INTEGRATION-MATRIX.md); the security baseline is in [SECURITY-ARCHITECTURE.md](../security/SECURITY-ARCHITECTURE.md).

## Sources

- [React: creating a React app](https://react.dev/learn/creating-a-react-app)
- [Vite guide](https://vite.dev/guide/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Fastify TypeScript support](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Queues](https://supabase.com/docs/guides/queues)
- [pgvector](https://github.com/pgvector/pgvector)
- [Vercel AI SDK provider management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
- [Render background workers](https://render.com/docs/background-workers)
- [Render pricing](https://render.com/pricing)
- [Stripe global availability](https://stripe.com/global)
- [Meta Marketing API](https://developers.facebook.com/documentation/ads-commerce/marketing-api)
