---
name: prd-check
description: Compare the codebase to docs/PRD.md and report which requirement IDs are done, partial, or missing. Use for progress reports or before each roadmap phase ends.
---

# prd-check

1. Read `docs/PRD.md` sections 4, 5, 11 and Appendix A.
2. For each requirement ID (AUTH-*, USR-*, CON-*, etc.) find the implementing code and test.
3. Classify: Done (code + test), Partial (code, no test or incomplete), Missing.
4. Verify every row in Appendix A (PH lessons) is satisfied.
5. Output a table: ID, status, evidence (file:line), next action. End with a percentage per phase and the three highest-risk gaps.
Do not modify code in this skill.
