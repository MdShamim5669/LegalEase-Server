# LegalEase Backend: Project Memory

Online lawyer-consultation platform. Backend REST API only. Full spec: `docs/PRD.md` (read it before big changes).

## Stack
Node.js, Express 5, TypeScript (strict), PostgreSQL, Prisma 7 (`@prisma/adapter-pg`), Better Auth + JWT + Google OAuth + Email OTP, Stripe (Checkout + Webhook), Multer + Cloudinary, Zod v4, Nodemailer + EJS, node-cron, pino, pnpm.

## Commands
- `pnpm dev` run with tsx watch
- `pnpm build` tsc, `pnpm start` node dist/server.js
- `pnpm lint`, `pnpm test`
- `pnpm prisma migrate dev`, `pnpm prisma generate`
- `pnpm stripe:webhook` forward Stripe events locally

## Architecture
Module pattern under `src/app/module/<name>/`: `<name>.route.ts`, `.controller.ts`, `.service.ts`, `.validation.ts`, `.interface.ts`.
- Route: wiring only (auth, validateRequest, controller). No logic.
- Controller: parse request, call service, send response via `catchAsync` + `sendResponse`.
- Service: all business logic and Prisma calls.
- Shared code lives in `src/app/{lib,utils,middleware,errorHelpers,config}`.

Modules: auth, user, lawyer, practiceArea, schedule, lawyerSchedule, consultation, advice, document, review, payment, audit.

## Non-negotiable rules
Detailed rules are in `.claude/rules/`. Summary:
1. Every non-public route has `checkAuth(...roles)` at definition time.
2. Booking uses atomic `updateMany where isBooked: false`; count 0 -> 409. Never read-then-write.
3. No Stripe/network calls inside `prisma.$transaction`.
4. Consultation status changes go through the transition map only.
5. Only ADMIN/SUPER_ADMIN may create lawyers; only SUPER_ADMIN may create/update/delete admins; SUPER_ADMIN can never be created via API.
6. Case documents readable only by that consultation's client and lawyer. Admin access is audit-logged.
7. Lawyers appear publicly only when `isVerified && !isDeleted`.
8. All inputs validated with Zod. `validateRequest` must `return next(error)` on failure.
9. Times stored in UTC. Money stored as integer BDT (no floats).
10. No real secrets anywhere. `.env.example` uses placeholders only.

## Style
- TypeScript strict, no `any` (use `unknown` + narrowing).
- Throw `AppError(status, message)`; never send responses from services.
- Use `http-status` names, not numbers.
- Soft delete (`isDeleted`, `deletedAt`); never hard delete user data.
- Prefer small pure functions; add tests for services.
- Bangla for conceptual explanations to the user; code, identifiers, commits in English.

## Definition of done
Zod validation, auth guard, service tests, no lint errors, migration included, PRD requirement ID referenced in the PR description.
