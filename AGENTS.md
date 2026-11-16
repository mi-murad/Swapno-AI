# Swapno AI project guidance

- Follow the approved master product blueprint and keep the modular monolith boundaries clear.
- Preserve existing work. Inspect files before changing them; avoid broad rewrites.
- Keep service credentials and secrets server-side. Never put secrets in source control, browser bundles, or logs.
- Enforce workspace access in the API and database; add negative cross-tenant tests for every new tenant-owned module.
- Build small working flows, label integrations honestly, and verify changes with actual checks before claiming completion.
- Do not connect paid providers, social OAuth, publishing, advertising, production deployment, or push changes without the user's explicit stage approval.
- Keep UI strings available in English and Bangla. Design for small screens and non-technical business owners.
- Use the current local setup and security verification guides when running or assessing the application.
