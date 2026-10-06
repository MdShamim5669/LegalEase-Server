---
name: documenting-apis
description: Synchronizes docs/API.md, .env.example, and API client collections with active Express route definitions, Zod validation schemas, and auth guards. Use after adding or updating endpoints, parameters, or environment configurations.
---

# Documenting APIs & Environment Schemas

Keep `docs/API.md`, `.env.example`, and API client collections in perfect synchronization with the codebase routes, authorization roles, and request/response schemas.

## When to Use This Skill
- Adding, updating, or deprecating API endpoints.
- Introducing new environment variables into `src/app/config/env.ts`.
- Preparing documentation before pull request reviews or frontend team handoffs.

## Documentation Sync Workflow

```markdown
### API Documentation Checklist
- [ ] 1. Route Discovery: Scan all `src/app/module/**/*.route.ts` files.
- [ ] 2. Schema Extraction: Extract HTTP method, path, allowed `checkAuth` roles, and Zod schemas from `<name>.validation.ts`.
- [ ] 3. Sync docs/API.md:
      - Update module tables with columns: Method | Path | Auth Roles | PRD ID | Purpose.
      - Add request body and query parameter examples.
      - Document expected success payload and error response codes.
- [ ] 4. Sync .env.example:
      - Compare environment variables in `src/app/config/env.ts` with `.env.example`.
      - Ensure EVERY variable is present with a generic placeholder (e.g. `your_api_key_here`).
      - NEVER commit real credentials, staging tokens, or live keys.
- [ ] 5. Consistency Audit: Report any routes that exist in code but are missing from `docs/API.md`, and vice-versa.
```

## Standard API Endpoint Markdown Format

```markdown
### POST /api/v1/consultations/book
* **Auth:** `Role.CLIENT` (`checkAuth(Role.CLIENT)`)
* **PRD Reference:** `CON-1`, `BL-1`
* **Description:** Locks slot atomically and creates consultation with Stripe checkout session URL.

#### Request Body
```json
{
  "lawyerId": "019...",
  "scheduleId": "019...",
  "type": "VIDEO",
  "topic": "Need advice regarding property title deed verification"
}
```

#### Success Response (`201 CREATED`)
```json
{
  "success": true,
  "message": "Consultation booked successfully",
  "data": {
    "consultation": {
      "id": "019...",
      "status": "SCHEDULED",
      "paymentStatus": "UNPAID"
    },
    "paymentUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

#### Error Responses
* `400 BAD_REQUEST`: Validation failure or past slot.
* `404 NOT_FOUND`: Lawyer not found or unverified.
* `409 CONFLICT`: Slot already booked by another user.
* `502 BAD_GATEWAY`: Payment gateway initialization failed.
```
