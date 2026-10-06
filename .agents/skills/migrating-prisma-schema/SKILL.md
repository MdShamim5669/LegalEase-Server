---
name: migrating-prisma-schema
description: Manages Prisma 7 schema evolution, PostgreSQL migrations, UUIDv7 identifiers, soft-delete patterns, and custom raw SQL constraints for LegalEase. Use when altering models, relations, indexes, or database constraints.
---

# Migrating Prisma Schema & Database Design

Safely design and evolve the LegalEase PostgreSQL database schema using Prisma 7 (`@prisma/adapter-pg`) while strictly preserving data integrity, soft deletion patterns, and raw SQL constraints.

## When to Use This Skill
- Adding or editing models in `prisma/schema/*.prisma`.
- Creating and applying Prisma database migrations.
- Implementing partial indexes or PostgreSQL CHECK constraints not expressible in standard Prisma schema syntax.
- Auditing foreign key delete actions (`Restrict` vs `Cascade`).

## Workflow & Plan-Validate-Execute Pattern

```markdown
### Schema Migration Checklist
- [ ] 1. Edit Domain Schema: Update appropriate file under `prisma/schema/*.prisma`.
- [ ] 2. Integrity Checks:
      - Uses UUIDv7: `@id @default(uuid(7))`.
      - Includes soft delete fields where required: `isDeleted Boolean @default(false)`, `deletedAt DateTime?`.
      - Money fields are `Int` (integer BDT), never `Float`.
      - Foreign keys and search fields indexed.
- [ ] 3. Format: Run `pnpm prisma format`.
- [ ] 4. Generate Migration: Run `pnpm prisma migrate dev --name <descriptive_name>`.
- [ ] 5. Review SQL Diff: Inspect generated SQL for accidental table drops or column truncation.
- [ ] 6. Attach Raw Constraints: Ensure partial indexes and CHECK constraints are preserved (see resources/raw-constraints.sql).
- [ ] 7. Client Generation: Run `pnpm prisma generate`.
- [ ] 8. Verify App: Run `pnpm test` to confirm services and seed scripts work.
```

## Raw SQL Constraints (Required in Migrations)
Prisma schema DSL cannot express partial indexes or custom CHECK constraints natively. When creating migrations touching `Consultation`, `Review`, `Lawyer`, or `Payment`, verify the SQL contains:

👉 **[`resources/raw-constraints.sql`](resources/raw-constraints.sql)**

```sql
-- Partial unique index allowing re-booking after cancellation:
CREATE UNIQUE INDEX IF NOT EXISTS "consultation_active_slot_uq"
  ON "Consultation" ("lawyerId", "scheduleId")
  WHERE "status" <> 'CANCELED';

-- Domain check constraints:
ALTER TABLE "Review"   ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Lawyer"   ADD CONSTRAINT "lawyer_fee_positive"  CHECK ("consultationFee" > 0);
ALTER TABLE "Payment"  ADD CONSTRAINT "payment_refund_lte"   CHECK ("refundedAmount" <= "amount");
```

## Critical Rules
- **Never edit a committed/applied migration.** Always append a new migration.
- **Never use a plain `@@unique([lawyerId, scheduleId])` on Consultation.** It would prevent a slot from being re-booked after a previous consultation on that slot was cancelled.
- **Dates in UTC:** All timestamps must use UTC in the database.
