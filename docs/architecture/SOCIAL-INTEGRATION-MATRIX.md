# Social Platform Integration Matrix

**Status:** Dated capability and access review; no OAuth app, platform account, or connector has been provisioned.
**Review date:** 16 November 2026

Platform API access depends on the app, business/account type, permissions, review tier, region, and approved use case. This matrix is for sequencing and risk discovery, not a guarantee of access. Recheck the linked official documentation before requesting any permission or building a connector.

| Platform | Candidate user value | Official capability/access evidence | Proposed safe sequence | Main gates and caveats |
|---|---|---|---|---|
| Facebook Pages + Instagram professional accounts (Meta) | Account selection, organic content workflow, insights, later ads reporting | Meta documents Instagram Login with dedicated `instagram_business_*` permissions. Marketing API access levels and permissions govern ad operations; app review is relevant for broader users. | Read-only connection and account discovery → insights → prepare content → approved publish after capability verification → ads read/reporting → separately approved campaign writes. | Different Instagram login products and permissions exist. App Review, business ownership, tokens, API versioning, eligible account types, media requirements, and rate limits must be tested. Never combine organic content and ad write scopes by default. |
| TikTok | Video/photo post preparation and later approved publishing | Content Posting API requires a registered app/product and approved `video.publish` scope plus user authorization. TikTok says unaudited clients' direct posts are restricted to private viewing until audit. | Manual draft/export first → app authorization and test post in private mode → audit/review → live publishing only after verification. | Audit requirement, media URL/domain verification, creator consent, content restrictions, upload lifecycle, app review. Private test posts are not public-publishing evidence. |
| YouTube | Video metadata and upload preparation, later upload | Data API `videos.insert` supports upload with OAuth scopes such as `youtube.upload`; quota and channel/platform limits apply. | Prepare metadata and resumable upload UX → user-authorized private/unlisted test → validate OAuth/quota and channel response → publishing only after review and explicit confirmation. | OAuth verification, API quota, channel eligibility and daily upload restrictions, large-file handling, visibility defaults, moderation and user confirmation. Upload has external side effects. |
| LinkedIn Pages | Organization post preparation, reporting, later company publishing | Community Management APIs require access request and vetting; official docs describe Development and Standard tiers. Member post-management permission is closed in the referenced current documentation. | Manual preparation and copy/export → request access only after product use case is concrete → implement organization-scoped approved capabilities → verify Standard-tier behavior if required. | Registered legal organization, business email/domain, Page verification, app review, use-case restrictions, version sunset cadence. Do not plan member-post access as available. |
| Pinterest | Pin/board management, analytics, later organic publishing and ads | API v5 supports Pins/boards; create requires scopes such as `boards:read/write` and `pins:read/write`. Trial access can create Pins visible only to the creator; Standard access is intended for user-facing functionality. | Read-only boards/Pins → creator-only trial tests → apply for Standard access → approved public publishing → evaluate ads separately. | Trial/Standard tier difference, OAuth scopes, asset/media workflow, account/board ownership, rate limits and app approval. Trial-created content does not prove public distribution. |

## Integration invariants

- Connect only accounts the authorizing user owns or is explicitly authorized to manage. Show the target identity and requested scopes before consent.
- Ask only for scopes needed by the current feature. Keep ads, messaging, comments, and organic publishing permissions separate where platform APIs permit.
- Default to read-only. Keep all write actions behind a versioned approval that shows account, exact content/settings, timing, budget when relevant, and consequence.
- Recheck workspace membership, token validity, approval version, and content version in the server worker immediately before execution.
- Use idempotency and remote reconciliation. Store verified external IDs and responses; report queued, failed, uncertain, and succeeded accurately.
- Provide disconnect/revoke handling, token rotation, platform data deletion/retention controls, and platform policy change monitoring.
- Maintain per-platform capability flags and API versions. Do not expose a generic "publish everywhere" button unless each destination's exact format, state, and outcome is explicit.

## First-party sources

- [Meta Instagram API changelog and Instagram Login permissions](https://developers.facebook.com/docs/instagram/platform/instagram-api/changelog/)
- [Meta Marketing API access and permissions](https://developers.facebook.com/docs/business-management-apis/2tier-bm-solution/get-started)
- [TikTok Content Posting API: get started](https://developers.tiktok.com/docs/en/content-posting-api-get-started)
- [YouTube Data API: videos.insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert)
- [LinkedIn Community Management app review](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review)
- [Pinterest API access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/)
- [Pinterest create boards and Pins](https://developers.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/)
