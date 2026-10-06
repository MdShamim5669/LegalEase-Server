---
name: auditing-security
description: Audits the LegalEase codebase for security vulnerabilities, route authorization guards, role escalation, data leakage, and lawyer-client confidentiality breaches. Use before pull requests, releases, or when performing security reviews.
---

# Auditing Security & Confidentiality

Perform rigorous static and manual security audits across LegalEase API routes, authorization middleware, file uploads, payments, and client-lawyer confidentiality boundaries.

## When to Use This Skill
- Before merging any branch into main or deploying to staging/production.
- When adding new routes, authentication paths, or file upload handlers.
- When verifying compliance with PRD Section 4.1 (Access Matrix) and Appendix A (Lessons from PH Healthcare).

## Automated Audit Commands

Run these specific commands to detect common regressions:

```bash
# 1. Detect routes missing checkAuth (Public routes expected only on auth, public lawyer/specialty lists, and webhook)
grep -rn "router\.\(get\|post\|patch\|put\|delete\)" src/app/module --include=*.route.ts | grep -v checkAuth

# 2. Scan for hardcoded secrets or production keys
grep -rniE "(sk_live|sk_test|whsec_|AKIA|api[_-]?key\s*=\s*['\"][A-Za-z0-9]{16,})" . --exclude-dir=node_modules --exclude-dir=.git

# 3. Detect empty source files
find src -name "*.ts" -size 0

# 4. Check for Stripe or network calls inside Prisma transactions
grep -rn "\$transaction" src/app/module | head -30
```

## Manual Verification Checklist

Track your review using the detailed checklist in:  
👉 **[`resources/audit-checklist.md`](resources/audit-checklist.md)**

### Critical Security Boundaries
1. **Identity Integrity:** Identity (`userId`, `role`) MUST come from `req.user` (verified JWT/session). Never trust `req.body.role` or `req.body.userId`.
2. **Role Escalation:** Only `SUPER_ADMIN` can create or manage `ADMIN`. Creating `SUPER_ADMIN` via API is strictly forbidden.
3. **Confidentiality:** Case documents and advice notes are accessible strictly by that consultation's client and lawyer. Admins receive metadata only.
4. **Public Exposure Guard:** Public queries for lawyers MUST include `isVerified: true`, `isDeleted: false`, and `user: { status: 'ACTIVE' }`.
5. **Stripe Webhook:** Verifies cryptographic signature using raw body before parsing JSON. Replays are rejected via unique `stripeEventId`.
