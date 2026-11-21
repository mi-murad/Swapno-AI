// Vercel detects Fastify entrypoints at the repository root or in ./src.
// The application itself remains in the API workspace; the root shim makes
// that workspace entrypoint discoverable without changing local development.
import "../apps/api/dist/server.js";
