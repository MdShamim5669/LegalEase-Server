---
name: api-docs
description: Regenerate or verify docs/API.md and .env.example from the actual route files. Use after endpoints change or before handoff.
---

# api-docs

1. List all `*.route.ts` files and extract method, path, `checkAuth` roles, and validation schema.
2. Rewrite `docs/API.md`: per module, a table of endpoints (method, path, roles) followed by request and response examples and error cases.
3. Compare `.env.example` with variables read in `config/env.ts`; add missing ones with placeholder values only.
4. Report endpoints in code but missing from docs, and the reverse.
5. Keep the PRD requirement ID next to each endpoint where applicable.
