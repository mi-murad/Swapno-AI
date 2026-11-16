# AI Model Evaluation Matrix

**Status:** Research plan; no model/provider selected, keys configured, or live requests made.
**Review date:** 16 November 2026

## Decision rule

Choose models by measured task quality, data terms, reliability, and total task cost for Swapno AI. Do not choose by leaderboard rank or provider loyalty. The names below are candidates visible in first-party provider documentation on the review date; availability, account eligibility, model IDs, prices, and deprecation status can change. Recheck before implementation and approval.

## Candidate matrix

| Task | Candidate path | What to compare | Recommendation for evaluation |
|---|---|---|---|
| Bangla/English business writing, summaries, classification, structured output | Current stable text models from Google Gemini, OpenAI, and Anthropic Claude; optionally the same models through OpenRouter where supported | Native Bangla fluency (including local commerce phrasing), instruction following, factual consistency, JSON/schema validity, latency, errors, input/output price, retention/training terms, region, tool support | Evaluate one current fast model and one stronger reasoning model per viable provider. Do not hard-code IDs in product decisions until a live approval. |
| Source-grounded market/research synthesis | Text models with suitable retrieval/search capabilities; compare direct provider tools and a controlled application retrieval flow | Citation correctness, claim/source alignment, recency labeling, uncertainty, fabricated-source rate, Bangla source handling, full task cost and latency | Keep source collection and citations in Swapno-owned code/data so the UI can inspect provenance. Provider search is an optional capability, not a substitute for evidence records. |
| Image creation/editing for brand assets | Google Gemini image family candidates: Nano Banana 2 (`gemini-3.1-flash-image`), Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`), Nano Banana Pro (`gemini-3-pro-image`); compare current OpenAI image API candidates if available for the account | Brand adherence, Bangla text rendering, product fidelity, aspect-ratio control, editing consistency, moderation, output quality, latency, per-image cost, commercial terms, watermark/provenance | Test Lite/fast and premium options on the same approved brief/reference images. Candidate names/models are not a purchasing recommendation. |
| Optional gateway comparison | OpenRouter with explicitly pinned provider/model and privacy settings | Provider selection transparency, fallback behavior, data route, retention/training terms for every endpoint, availability, markup/fees, observability, and ability to disable routes | Compare against direct calls. Keep routing fixed and visible in evaluation; do not permit silent paid fallback. Gateway introduces another data processor. |

The Gemini API currently lists Nano Banana 2 and Nano Banana Pro under distinct model IDs. This confirms they are real candidates in its published model catalog, not that they are accessible or best for this product. OpenRouter states that inputs may be sent to selected/routed model providers and provider retention/training practices vary; evaluate the exact provider route, not only the gateway. See first-party references below.

## Swapno-specific test set

Build a small, versioned, permission-cleared evaluation set before live testing. Include:

1. Bangla and English product descriptions for Bangladesh ecommerce, including code-switching and local currency/date conventions.
2. Brand voice transformation from user-approved examples, with forbidden claims and required disclaimers.
3. Product/offer extraction from user-provided documents, with source citations and an explicit unknown when evidence is missing.
4. Research summaries using fixed source packets; score source-faithfulness and unsupported claims.
5. Content calendar ideas across Facebook, Instagram, TikTok, YouTube, LinkedIn, and Pinterest, checking platform fit and factual claims.
6. Structured content/campaign drafts with schema validity, no invented price/stock/discount, and no action outside the requested scope.
7. Image prompts/references for Bengali text, product fidelity, brand consistency, editability, and artifact/moderation behavior.

Use consented or synthetic test data; do not put real customer or confidential workspace material into external model tests without a reviewed provider and data policy.

## Scoring and decision record

| Metric | Measurement |
|---|---|
| Task quality | Blind human rating rubric; Bangla-native reviewers for Bangla output; per-task acceptance threshold set before comparison |
| Factuality/provenance | Supported claims divided by checkable claims; unsupported claim and fabricated citation counts |
| Instruction and schema compliance | Pass rate against explicit constraints and validated output schema |
| Brand fit and usefulness | Reviewer score against approved brand voice and user edit burden |
| Reliability | Success rate, timeout/error rate, retry success, moderation refusal rate |
| Latency | Median and p95 end-to-end time by task and model route |
| Cost | Actual input/output/tool/image charges per accepted task, including retries and gateway fees |
| Privacy and control | Current terms, retention/training, region, subprocessors, access controls, deletion, and fallback behavior reviewed for the exact route |

Record test-set version, prompt version, provider, model ID/version, endpoint/route, date, configuration, scores, price source, reviewer, and decision. Re-run after a model or provider change. Quality, privacy, and reliability are gates; do not select a cheaper model that fails those gates.

## Sources

- [Gemini API models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini image generation and Nano Banana models](https://ai.google.dev/gemini-api/docs/image-generation)
- [OpenAI API model documentation](https://platform.openai.com/docs/models)
- [Anthropic model deprecations and current model status](https://docs.anthropic.com/en/docs/about-claude/model-deprecations)
- [OpenRouter provider data practices](https://openrouter.ai/privacy)
- [OpenRouter provider directory](https://openrouter.ai/providers)
