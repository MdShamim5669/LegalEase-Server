# LegalEase-Server: Backend REST API

LegalEase online lawyer-consultation platform backend REST API.

## Tech Stack
* Node.js 22 LTS, Express 5, TypeScript (strict mode)
* PostgreSQL 16 + Prisma 7 (`@prisma/adapter-pg`)
* Better Auth (PostgreSQL session persistence) + JWT + Google OAuth + Email OTP
* Stripe Checkout & Webhook behind `PaymentGateway` interface (BDT integer taka)
* Multer (memory storage) + Cloudinary (PDF case documents & avatars)
* Zod v4 validation schemas
* Nodemailer + EJS templates
* node-cron (unpaid cancellation every 25 min)
* pino & pino-http logger

## Quick Commands
* `pnpm dev` - Start development server with tsx watch
* `pnpm build` - Compile TypeScript to dist/
* `pnpm start` - Run compiled server (`node dist/server.js`)
* `pnpm test` - Run Vitest unit & integration test suite
* `pnpm lint` - Run ESLint checks
* `pnpm prisma migrate dev` - Apply migrations & format
* `pnpm prisma generate` - Generate Prisma Client
* `pnpm stripe:webhook` - Forward Stripe webhook events locally

## Antigravity Skills for Backend
Located in `.agent/skills/` (and `.agents/skills/`):
* `booking-consultations` - Atomic slot locking, checkout sessions, webhook idempotency, cron release
* `handling-errors` - AppError, central error envelope, Zod/Prisma mappers, external compensation
* `building-modules` - Scaffolds module routes, controllers, services, interfaces, and tests
* `migrating-prisma-schema` - Prisma 7 schema management, UUIDv7, partial unique indexes, raw CHECK constraints
* `auditing-security` - Role guards (`checkAuth`), identity protection, document confidentiality
* `documenting-apis` - Synchronizes `docs/API.md` and `.env.example` placeholders
* `verifying-prd-compliance` - Audits compliance against PRD requirement IDs
