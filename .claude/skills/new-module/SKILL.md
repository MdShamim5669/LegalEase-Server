---
name: new-module
description: Scaffold a new LegalEase backend module (route, controller, service, validation, interface) with auth guards and tests. Use when the user says "new module", "add endpoint group", or names a PRD module to build.
---

# new-module

Usage: `/new-module <moduleName>`

1. Read `CLAUDE.md`, `.claude/rules/api-style.md`, `.claude/rules/security.md`, and the matching PRD sections (4 for requirements, 6 for endpoints, 11 for logic rules).
2. Create `src/app/module/<moduleName>/` with:
   - `<moduleName>.interface.ts`
   - `<moduleName>.validation.ts` (Zod v4, `{ body, query, params }`)
   - `<moduleName>.service.ts`
   - `<moduleName>.controller.ts` (`catchAsync` + `sendResponse`)
   - `<moduleName>.route.ts` (`checkAuth` on every non-public route, then `validateRequest`)
3. Register the router in `src/app/routes/index.ts`.
4. Add `<moduleName>.service.test.ts`.
5. Update `docs/API.md`.
6. Run `pnpm lint && pnpm test`.

Controller template:
```ts
const create = catchAsync(async (req: Request, res: Response) => {
  const result = await XService.create(req.user!, req.body);
  sendResponse(res, { httpStatusCode: status.CREATED, success: true, message: "Created", data: result });
});
```
Report the PRD IDs covered and any open question you had to assume.
