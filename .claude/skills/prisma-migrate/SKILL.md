---
name: prisma-migrate
description: Change the Prisma schema safely and produce a migration. Use when adding models, fields, indexes, or constraints.
---

# prisma-migrate

1. Read `.claude/rules/prisma-and-data.md`.
2. Edit the right file in `prisma/schema/`.
3. Check: UUIDv7 id, soft delete fields where required, indexes on FKs, integer money, unique constraints from the PRD.
4. Run `pnpm prisma format`, then `pnpm prisma migrate dev --name <descriptive_name>`.
5. Run `pnpm prisma generate`.
6. Review the generated SQL for destructive statements (drops, type changes). If any exist, stop and explain the data-loss risk before continuing.
7. Update seed scripts and affected services/types.
8. Run `pnpm test`.

Never edit an applied migration. If a migration was wrong, add a new one.
