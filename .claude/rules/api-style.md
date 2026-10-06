---
description: API, validation, error handling conventions
globs: ["src/app/**/*.ts"]
---

# API style

- Base path `/api/v1`. Resource names plural kebab-case.
- Response envelope via `sendResponse`: `{ success, message, data, meta? }`.
- Lists accept `searchTerm`, filters, `page`, `limit`, `sortBy`, `sortOrder`, `fields`; return `meta: { page, limit, total }`. Cap `limit` at 100.
- Validate with Zod in `<name>.validation.ts`; schema shape `{ body: ..., query: ..., params: ... }`.
- `validateRequest` returns `next(error)` on failure and never calls `next()` afterwards.
- Throw `AppError`; central `globalErrorHandler` maps Zod, Prisma (P2002, P2025), and JWT errors.
- Register `notFound` BEFORE `globalErrorHandler`.
- Use `catchAsync` for every controller.
- Naming: files camelCase module folders, `kebab` for routes, PascalCase for types, `UPPER_SNAKE` for enums.
- Never create empty source files. Delete or implement.
- Every new endpoint must be added to `docs/API.md` and to the Postman/Bruno collection.
