---
description: Security rules for all backend code
globs: ["src/**/*.ts"]
---

# Security rules

- Every route that is not explicitly public (register, login, verify, forgot/reset, public lawyer list/detail, practice-area list, webhook) MUST include `checkAuth(Role.X, ...)`. Reviewing a new route? Check this first.
- Never trust `req.body.role`, `userId`, or `lawyerId` for identity. Take identity from `req.user`.
- Role escalation: only SUPER_ADMIN creates ADMIN. Nobody creates SUPER_ADMIN via API (seed only).
- Cookies: `httpOnly: true`, `secure: true` in production, `sameSite` set explicitly.
- Rate limit auth, OTP, and forgot-password endpoints.
- OTP: 6 digits, 2 minute expiry, single use, limited attempts.
- Blocked/deleted users: rejected in `checkAuth` on every request.
- Stripe webhook: use raw body, verify signature, store `stripeEventId` unique, ignore replays.
- Never log tokens, OTPs, passwords, card data, or document contents.
- File uploads: allow-list MIME (`application/pdf` for documents, images for icons), size cap (5 MB), random filenames, delete the Cloudinary asset if the request later fails.
- `.env.example` contains placeholders only (`your_key_here`). Never commit `.env`.
- Error responses must not leak stack traces in production.
