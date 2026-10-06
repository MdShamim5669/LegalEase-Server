---
description: Confidentiality and legal-domain rules
globs: ["src/app/module/document/**", "src/app/module/advice/**", "src/app/module/audit/**", "src/app/module/lawyer/**"]
---

# Privacy and legal-domain rules

- Case documents and advice notes are confidential. Readable only by the client and lawyer of that consultation.
- Admins get metadata (ids, status, times, payment status), never document contents or advice text.
- If an exceptional admin access path is ever added, it MUST write an `AuditLog` row (actor, action, entity, entityId, reason).
- Lawyers are public only when `isVerified === true`. Verification requires a unique `barCouncilNo` reviewed by an Admin.
- Every client-facing response about consultations includes the disclaimer constant: "This is preliminary consultation, not formal legal representation."
- Do not store raw problem text beyond `topic` (short). Do not send document contents to third-party AI services.
- Do not log personal data; log ids.
- Deleting a user soft-deletes; documents are retained per the retention policy (open question Q5) and never publicly listed.
