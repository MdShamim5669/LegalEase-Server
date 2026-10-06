---
name: verifying-prd-compliance
description: Audits codebase implementation against LegalEase PRD requirements, business logic rules, and historical lesson constraints. Use when assessing development progress, verifying completion of roadmap phases, or running pre-release checks.
---

# Verifying PRD Compliance

Audit the LegalEase repository against the formal specifications in `docs/PRD.md` to measure progress, verify requirement coverage, and surface gaps.

## When to Use This Skill
- Assessing project status at milestones or phase completions (`[P1]` to `[P5]`).
- Verifying whether a feature has both implementation code and automated tests.
- Auditing against lessons learned from PH Healthcare (PRD Appendix A).

## Verification Procedure

```markdown
### PRD Audit Workflow
1. Read PRD Requirements: Review sections 4 (Core Functionality), 5 (Business Rules), 11 (Business Logic Rules), and Appendix A.
2. Codebase Tracing: For each requirement ID (e.g. `AUTH-1`, `CON-7`, `BL-1`):
   - Locate implementing code under `src/app/module/` or `src/app/`.
   - Locate test verification under `*.test.ts`.
3. Classification:
   - **Done:** Both implementation code and automated test coverage exist.
   - **Partial:** Implementation exists but lacks tests or handles only part of the rule.
   - **Missing:** Not yet implemented in the codebase.
4. Lesson Checks: Verify all 12 items in PRD Appendix A are fully respected.
5. Generate Report: Produce status matrix with completion percentages per phase.
```

## Audit Report Format

When reporting compliance, generate a structured markdown table:

| Requirement ID | Description | Status | Evidence (file:line) | Test (file:line) | Gaps / Action |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `AUTH-1` | Client registration transaction | Done | `auth.service.ts:25` | `auth.service.test.ts:40` | - |
| `CON-7` | Atomic slot lock + partial index | Done | `consultation.service.ts:50` | `consultation.race.test.ts:18` | - |
| `BL-3` | No Stripe calls in `$transaction` | Done | `consultation.service.ts:75` | Code inspection | - |

End the audit with:
- **Phase Completion Summary:** P1 %, P2 %, P3 %, etc.
- **Top 3 Highest-Risk Gaps** (concurrency races, auth oversights, data loss hazards).
