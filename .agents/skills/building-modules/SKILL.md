---
name: building-modules
description: Scaffolds and implements complete LegalEase backend modules (route, controller, service, validation, interface, tests) according to strict project architecture, auth guards, and Zod schemas. Use when adding new API modules or endpoints.
---

# Building Backend Modules

Scaffold and implement clean, modular, and type-safe backend feature modules under `src/app/module/<moduleName>/` matching the LegalEase module pattern.

## When to Use This Skill
- Creating a new feature module (e.g. `auth`, `lawyer`, `practiceArea`, `consultation`, `review`, `document`).
- Adding new endpoints to an existing module.
- Structuring request validation, auth guards, and service layers.

## Workflow & Verification Loop

```markdown
### Module Implementation Checklist
- [ ] 1. Types & Interfaces: Define domain and payload types in `<name>.interface.ts`.
- [ ] 2. Validation Schemas: Create Zod v4 schemas in `<name>.validation.ts` shaped as `{ body?, query?, params? }`.
- [ ] 3. Service Layer: Implement business logic and Prisma queries in `<name>.service.ts`. Throw `AppError`.
- [ ] 4. Controller Layer: Implement thin handlers in `<name>.controller.ts` using `catchAsync` and `sendResponse`.
- [ ] 5. Route Wiring: Wire endpoints in `<name>.route.ts`. Attach `checkAuth(...roles)` to EVERY non-public route before `validateRequest`.
- [ ] 6. Router Registration: Mount router in `src/app/routes/index.ts`.
- [ ] 7. Service Testing: Write unit & integration tests in `<name>.service.test.ts`.
- [ ] 8. Documentation: Document method, path, roles, params, and response in `docs/API.md`.
```

## Architectural Rules (Non-Negotiable)
1. **Route File is Wiring Only:** No business logic or database calls in routes.
2. **Auth Guard First:** Every non-public route must have `checkAuth(Role.X, ...)` before `validateRequest`.
3. **Zod Validation Return:** `validateRequest` must `return next(error)` on failure and never call `next()` afterwards.
4. **Thin Controllers:** Controllers only unpack `req.user`, `req.params`, `req.body`, `req.query`, call the service, and invoke `sendResponse`.
5. **Services Own Logic:** All Prisma operations and transaction boundaries belong in services. Never return HTTP status codes from services.

## Templates & Boilerplate
For standard templates of routes, controllers, services, and validations, consult:  
👉 **[`resources/templates.md`](resources/templates.md)**

## Execution Commands
```bash
# Verify TypeScript compilation and linting
pnpm lint
# Run module unit and integration tests
pnpm test
```
