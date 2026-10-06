---
description: Prisma, schema, and data handling rules
globs: ["prisma/**", "src/**/*.service.ts"]
---

# Prisma and data rules

- Schema split by domain in `prisma/schema/*.prisma`. UUIDv7 ids: `@id @default(uuid(7))`.
- Soft delete on User, Lawyer, Client, Admin, PracticeArea: `isDeleted Boolean @default(false)`, `deletedAt DateTime?`. All list/find queries filter `isDeleted: false`.
- Prisma cannot express partial indexes: add `consultation_active_slot_uq` and the CHECK constraints (review rating 1-5, fee > 0, refundedAmount <= amount) as raw SQL in a dedicated migration, and run `prisma migrate diff` in CI to confirm Prisma does not drop them.
- Index every FK, `isDeleted`, `isVerified`, and `(status, paymentStatus, createdAt)` on Consultation.
- Multi-step writes use `$transaction`: create-lawyer (User + Lawyer + LawyerPracticeArea), register (User + Client), booking, review + averageRating.
- Money is `Int` BDT. Never `Float` for money.
- Dates in UTC. Convert to Asia/Dhaka only at the presentation layer.
- Never edit a committed migration; add a new one. Name migrations descriptively.
- Select only needed fields; never return password hashes or session tokens.
- `averageRating` recalculated inside the review transaction using aggregate, not incremental drift.
- Case documents: store `fileUrl`, `title`, `consultationId`, `clientId`. Access checks happen in the service, not just the route.
