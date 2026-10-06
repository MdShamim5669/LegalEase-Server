# LegalEase Security & Confidentiality Checklist

Use this checklist to record the status of security verification.

| Item | Category | Requirement | Verified? | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **SEC-01** | Authorization | All non-public routes wrapped with `checkAuth(...roles)` | [ ] | Compare with PRD 4.1 access matrix |
| **SEC-02** | Identity | Caller identity sourced exclusively from `req.user` | [ ] | Reject `req.body.userId` tampering |
| **SEC-03** | Escalation | API prevents creating `SUPER_ADMIN`; `ADMIN` created only by `SUPER_ADMIN` | [ ] | Seed-only `SUPER_ADMIN` |
| **SEC-04** | Confidentiality | Case documents & advice readable only by consultation client and lawyer | [ ] | Verified in service layer, not just route |
| **SEC-05** | Public Guard | Unverified or soft-deleted lawyers never exposed in public queries | [ ] | Filter `isVerified: true, isDeleted: false` |
| **SEC-06** | Webhooks | Stripe webhook uses raw body, validates HMAC signature, and enforces unique `stripeEventId` | [ ] | Replays return 200 without duplicate action |
| **SEC-07** | Transactions | No Stripe, Cloudinary, or SMTP network calls inside `$transaction` | [ ] | Concurrency & lock starvation prevention |
| **SEC-08** | File Uploads | Upload allow-lists MIME type (`application/pdf` for docs), caps size at 5MB, cleans up Cloudinary assets on request errors | [ ] | Memory storage -> Cloudinary stream |
| **SEC-09** | Secrets | No API keys, passwords, or secrets in repo or `.env.example` | [ ] | `.env.example` has placeholders only |
| **SEC-10** | Validation | Zod validation on every endpoint; `validateRequest` calls `next(error)` on failure | [ ] | Never calls `next()` after error |
| **SEC-11** | Cookies & Tokens | Cookies configured with `httpOnly: true`, `secure: true` in production, explicit `sameSite` | [ ] | No tokens in client `localStorage` |
| **SEC-12** | Rate Limiting | Rate limits enabled on `/auth/login` (10/15min) and OTP endpoints (3/10min) | [ ] | Brute force prevention |
