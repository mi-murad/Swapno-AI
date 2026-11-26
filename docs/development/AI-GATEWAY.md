# Local AI gateway (9Router-compatible)

## Current implementation boundary

The API includes a provider-independent OpenAI-compatible chat-completions adapter. It is an internal server-side library only: no public AI route, automatic content generation, customer billing, or hosted provider connection is enabled yet. This keeps the first integration local and avoids exposing provider credentials to browsers.

## Connect a local 9Router instance

1. Start 9Router on the same PC as the Swapno AI API.
2. Confirm its model endpoint responds at `http://127.0.0.1:20128/v1/models`.
3. Copy the exact model ID returned by 9Router.
4. Add these values to the ignored root `.env` file:

   ```env
   AI_BASE_URL=http://127.0.0.1:20128/v1
   AI_API_KEY=your_private_9router_key
   AI_DEFAULT_MODEL=exact-model-id
   AI_REQUEST_TIMEOUT_MS=45000
   ```

5. Never commit `.env`, put the key in a `VITE_*` variable, or send it to frontend code.

## SaaS direction: hybrid

The intended commercial model is central AI by default plus optional Bring Your Own Key (BYOK). The local 9Router URL is only reachable from the same computer and must not be copied into Vercel or a hosted SaaS environment. For hosted use, deploy a secured gateway reachable from the API server or use an approved hosted endpoint. Keep provider credentials encrypted/server-side, isolate usage by workspace, enforce budgets and rate limits, and record provider/model/token usage. Confirm 9Router and upstream model-provider commercial/resale terms before charging customers for access.

## Next implementation steps

- Add an authenticated, workspace-authorized AI API route after defining usage limits and data handling.
- Add provider selection and BYOK credential storage only after a security design review.
- Add per-workspace usage ledger, budget enforcement, timeout/retry policy and audit events before enabling customer-facing generation.
- Keep external actions (publishing, messaging, ad spend) behind version-specific human approval.

## Local verification

The adapter tests mock the HTTP provider boundary. They do not require 9Router credentials or make billable requests. Run `npm run test --workspace @swapno/api` and `npm run typecheck --workspace @swapno/api`.
