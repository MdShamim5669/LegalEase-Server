# LegalEase: Product Requirements Document (Final)

| | |
|---|---|
| **Version** | 2.0 (final, supersedes 1.0) |
| **Product** | LegalEase, online lawyer-consultation platform |
| **Scope** | Backend REST API (primary) plus the web client behaviour the API must support |
| **Derived from** | PH Healthcare (Programming Hero L2B6): Doctor -> Lawyer, Specialty -> PracticeArea, Appointment -> Consultation |
| **Status keys** | `[P1]` to `[P5]` = roadmap phase. `Assumption` = decision taken here, change if you disagree (see Open Questions) |

---

## Table of Contents

1. Project Overview
2. Visual Documentation
3. Business Logic Flow
4. Core Functionality (incl. Data Model, Prisma schema, Relationships, Constraints and indexes)
5. Business Rules
6. API Endpoints
7. Project Structure
8. Technical Specifications
9. Environment Variables
10. Dependencies
11. Business Logic Rules
12. Response Format
13. Deployment Checklist
14. Future Considerations
- Appendix A: Requirement index and lessons from PH Healthcare
- Appendix B: Open questions

---

# 1. Project Overview

## 1.1 Summary
LegalEase lets **clients** find **verified lawyers**, pick a free 30-minute slot, book a consultation (video, phone, or chamber visit), pay online, share case documents confidentially, receive a written advice note, and review the lawyer. **Admins** verify lawyers and run the platform. A **Super Admin** manages admins.

## 1.2 Problem
- Hard to verify that a lawyer is genuine (Bar Council registration).
- No live view of lawyer availability; booking is by phone and uncertain.
- No online payment, no single record of consultations, documents, and advice.

## 1.3 Goals
1. Only verified lawyers are discoverable.
2. A slot can never be double-booked, even under concurrent requests.
3. Unpaid bookings never block slots for long (auto-release in 30 minutes).
4. Case documents and advice are visible only to the two people involved.
5. Every status change and refund follows an enforced rule, not a convention.

## 1.4 Non-goals (v1)
Legal representation or court filing, e-signature, case management, lawyer-to-lawyer referrals, mobile native apps, real video infrastructure (only a `videoCallingId` is issued), AI features (Phase 5).

## 1.5 Users and roles

| Role | Created by | Core abilities |
|---|---|---|
| **Client** | Self-register (email or Google) | Search lawyers, book and pay, upload documents, read advice, review |
| **Lawyer** | Admin (invitation) | Publish availability, run consultations, write advice, edit own profile |
| **Admin** | Super Admin | Verify lawyers, manage practice areas and schedules, moderate reviews, block users, view consultation metadata |
| **Super Admin** | Seeded from env at first start | Everything an Admin can, plus create, update, delete Admins |

## 1.6 Success metrics
Booking-to-paid conversion, unpaid-cancellation rate, double-booking incidents (target 0), lawyer verification turnaround, lawyer-search p95 latency (under 300 ms), slot utilisation, review coverage (% completed consultations reviewed), repeat-client rate.

## 1.7 Assumptions and constraints
- Frontend is a separate Next.js app (App Router, Tailwind, shadcn/ui, TanStack Query, react-hook-form with Zod). `Assumption`: the frontend is built after the API is stable.
- Currency is BDT, stored as integer taka.
- Stripe is used for learning and test mode. Production in Bangladesh needs SSLCommerz, aamarPay, or bKash behind the same `PaymentGateway` interface.
- This is a learning/portfolio project. Real launch needs advice from a Bangladesh-qualified lawyer on Bar Council rules for online lawyer advertising and data retention.

---

# 2. Visual Documentation

## 2.1 System architecture

```mermaid
flowchart LR
  subgraph Client_Side["Client side"]
    B["Browser: Next.js app"]
  end
  subgraph Server_Side["Server side"]
    API["Express 5 API: TypeScript"]
    AUTH["Better Auth plus JWT"]
    CRON["node-cron jobs"]
  end
  DB[("PostgreSQL via Prisma 7")]
  STRIPE["Stripe Checkout and Webhook"]
  CLD["Cloudinary: images and PDFs"]
  MAIL["SMTP: Nodemailer and EJS"]
  GOOG["Google OAuth"]

  B -->|"HTTPS JSON and cookies"| API
  API --> AUTH
  AUTH --> GOOG
  API --> DB
  CRON --> DB
  API -->|"create checkout session"| STRIPE
  STRIPE -->|"signed webhook"| API
  API --> CLD
  API --> MAIL
  B -->|"redirect to pay"| STRIPE
```

**Layering inside the API:** route -> middleware -> controller -> service -> Prisma. Routes hold wiring only, services hold all logic, controllers never touch Prisma.

## 2.2 Site map

```
/                              Homepage (public)
├── /lawyers                   Lawyer directory with search and filters (public)
│   └── /lawyers/[id]          Lawyer details and slot picker (public)
├── /practice-areas            All practice areas (public)
├── /how-it-works, /about, /contact
├── /disclaimer, /terms, /privacy
├── /login, /register, /verify-email
├── /forgot-password, /reset-password
└── /dashboard                 (role-based, login required)
    ├── Client
    │   ├── /dashboard                      Overview
    │   ├── /dashboard/consultations        List and filters
    │   ├── /dashboard/consultations/[id]   Detail: pay, documents, advice, review, cancel
    │   └── /dashboard/settings             Profile, password, photo
    ├── Lawyer
    │   ├── /dashboard                      Today and upcoming
    │   ├── /dashboard/availability         Pick, remove slots
    │   ├── /dashboard/consultations[/id]   Manage, advice note
    │   ├── /dashboard/reviews              Own reviews (read-only)
    │   └── /dashboard/settings             Profile, practice areas, fee, chamber
    └── Admin / Super Admin
        ├── /dashboard                      Platform stats
        ├── /dashboard/lawyers              Create, verify, edit, delete
        ├── /dashboard/practice-areas
        ├── /dashboard/schedules
        ├── /dashboard/consultations        Metadata only
        ├── /dashboard/reviews              Moderation queue
        ├── /dashboard/users                Block and unblock
        ├── /dashboard/admins               Super Admin only
        └── /dashboard/audit-log
```

## 2.3 Wireframe: Homepage and Lawyer Details

**Homepage**

```
┌──────────────────────────────────────────────────────────────────────┐
│ LegalEase     Lawyers  Practice Areas  How it works   [Login][Sign up]│
├──────────────────────────────────────────────────────────────────────┤
│   Talk to a verified lawyer, from anywhere.                           │
│   ┌────────────────────────────────────┐ ┌──────────┐                 │
│   │ Describe your issue or search...   │ │  Search  │                 │
│   └────────────────────────────────────┘ └──────────┘                 │
│   Popular: [Family] [Property] [Criminal] [Cyber] [Corporate]         │
├──────────────────────────────────────────────────────────────────────┤
│ Practice areas                                                        │
│ [icon Family] [icon Property] [icon Criminal] [icon Cyber] ...        │
├──────────────────────────────────────────────────────────────────────┤
│ Top-rated verified lawyers                                            │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│ │ photo      │ │ photo      │ │ photo      │ │ photo      │          │
│ │ Name  ✔    │ │ Name  ✔    │ │ Name  ✔    │ │ Name  ✔    │          │
│ │ Family law │ │ Property   │ │ Criminal   │ │ Cyber      │          │
│ │ ★4.8 12yrs │ │ ★4.7 9yrs  │ │ ★4.9 15yrs │ │ ★4.6 6yrs  │          │
│ │ ৳1,000     │ │ ৳800       │ │ ৳1,500     │ │ ৳700       │          │
│ │ [Book]     │ │ [Book]     │ │ [Book]     │ │ [Book]     │          │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
├──────────────────────────────────────────────────────────────────────┤
│ How it works:  1 Search  ->  2 Pick slot  ->  3 Pay  ->  4 Consult    │
├──────────────────────────────────────────────────────────────────────┤
│ Footer: disclaimer "Preliminary consultation, not legal representation"│
└──────────────────────────────────────────────────────────────────────┘
```

**Lawyer Details**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [← Back to lawyers]                                                   │
├───────────────────────────────────────┬──────────────────────────────┤
│ ┌──────┐ Adv. Name  ✔ Verified        │  Book a consultation         │
│ │photo │ Family, Property             │  Fee: ৳1,000 / 30 min        │
│ └──────┘ ★4.8 (32 reviews) · 12 yrs   │                              │
│ Languages: Bangla, English            │  Type: (•)Video ( )Phone     │
│ Chamber: Dhanmondi, Dhaka             │        ( )Chamber            │
│ Bar Council No: ******1234            │  Date:  [ < Tue 7 Oct > ]    │
│                                       │  ┌─────┐┌─────┐┌─────┐       │
│ About                                 │  │10:00││10:30││11:00│       │
│ ...bio...                             │  └─────┘└─────┘└─────┘       │
│                                       │  ┌─────┐┌─────┐ (grey = taken)│
│ Reviews                               │  │11:30││12:00│               │
│ ★★★★★ "Very clear advice."  Rahim     │  └─────┘└─────┘               │
│ ★★★★☆ "Helpful."            Karim     │  Topic (optional, 300 chars)  │
│ [Load more]                           │  [______________________]     │
│                                       │  [Pay now]  [Book, pay later] │
└───────────────────────────────────────┴──────────────────────────────┘
```

## 2.4 Wireframe: Dashboard

**Client dashboard**

```
┌─────────┬───────────────────────────────────────────────────────────┐
│ Logo    │ Welcome, Rahim                                [avatar ▾]  │
│ ─────── ├───────────────────────────────────────────────────────────┤
│ Overview│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│ Consult.│ │Upcoming 2│ │Unpaid 1  │ │Completed │ │Pay within 24m │  │
│ Settings│ └──────────┘ └──────────┘ │ 5        │ └───────────────┘  │
│         │                           └──────────┘                    │
│         │ Upcoming consultations                                    │
│         │ ┌───────────────────────────────────────────────────────┐ │
│         │ │ Adv. Name · Tue 7 Oct 10:00 · Video · SCHEDULED       │ │
│         │ │ UNPAID  [Pay now] [Cancel]                            │ │
│         │ │ Adv. Name2 · Thu 9 Oct 16:30 · Phone · SCHEDULED PAID │ │
│         │ │ [Join call] [Upload document]                         │ │
│         │ └───────────────────────────────────────────────────────┘ │
└─────────┴───────────────────────────────────────────────────────────┘
```

**Lawyer dashboard:** stat tiles (today, this week, completed, average rating), "Today" timeline with [Start] [Complete] [Cancel] buttons, availability calendar with toggleable slots (booked slots locked).

**Admin dashboard:** stat tiles (clients, lawyers, pending verification, consultations today, revenue this month), pending-verification queue, recent consultations (metadata), flagged reviews.

## 2.5 UI conventions

| Area | Convention |
|---|---|
| Language | Bangla and English; all copy in i18n files; Bangla numerals optional toggle |
| Time | Show in Asia/Dhaka with `h:mm a`; API sends ISO UTC. Always show weekday and date together |
| Money | `৳1,000` formatted from integer taka |
| Status colours | SCHEDULED blue, INPROGRESS amber, COMPLETED green, CANCELED grey; payment PAID green, UNPAID red, REFUNDED purple |
| Buttons | One primary action per card; destructive actions need a confirm dialog with consequence text (for example, refund amount) |
| Forms | Same Zod schema rules as the API; inline errors under fields; server `errorSources` mapped to fields |
| Feedback | Toast for success and recoverable errors; blocking dialog for payment and cancellation |
| Empty states | Always explain next step ("No consultations yet. Find a lawyer") |
| Loading | Skeletons, never spinners alone, for lists |
| Accessibility | WCAG 2.1 AA, keyboard-reachable slot picker, `aria-live` on toasts, colour never the only status signal |
| Responsive | Mobile first; slot picker becomes a bottom sheet under 768 px |
| Legal | Disclaimer visible on lawyer details, booking confirmation, and footer |

## 2.6 Design decisions

| # | Decision | Reason |
|---|---|---|
| D1 | Atomic `updateMany where isBooked=false` plus a partial unique index | Prevents race conditions at the database, not only in code |
| D2 | **Partial** unique index `(lawyerId, scheduleId) WHERE status <> 'CANCELED'` instead of a plain unique | A plain unique blocks re-booking a slot after a cancellation |
| D3 | Stripe calls outside DB transactions | Network latency inside a transaction holds locks and cannot be rolled back |
| D4 | Slots stored in UTC, shown in Asia/Dhaka | One source of truth, no DST or locale bugs |
| D5 | Integer taka | No floating-point money errors |
| D6 | Soft delete everywhere | Legal and financial records must stay auditable |
| D7 | `isVerified` flag plus note, not a status enum | Simple; reject = stays false with a note. Revisit if a multi-step review is needed |
| D8 | Two-layer auth: Better Auth session in DB plus short JWT | Session revocation (block, password reset) is instant; JWT keeps per-request cost low |
| D9 | `PaymentGateway` interface | Swap Stripe for a Bangladeshi gateway without touching booking logic |
| D10 | Admins do not read documents or advice by default | Confidentiality is a core trust promise |
| D11 | Lawyers are invited by Admin, not self-registered | Credentials are checked before anyone can appear publicly |
| D12 | Webhook is the only source of "PAID" | Browser redirects can be faked or lost |

## 2.7 Sequence diagram: book and pay

```mermaid
sequenceDiagram
  autonumber
  participant C as Client browser
  participant A as API
  participant D as PostgreSQL
  participant S as Stripe

  C->>A: POST /consultations/book (lawyerId, scheduleId, type, topic)
  A->>A: checkAuth(CLIENT), validate (Zod)
  A->>D: load lawyer (verified, not deleted) and slot (future)
  A->>D: BEGIN
  A->>D: updateMany LawyerSchedule isBooked=true WHERE isBooked=false
  alt count = 0
    A-->>C: 409 Slot already booked
  else count = 1
    A->>D: create Consultation (SCHEDULED, UNPAID) and Payment (UNPAID)
    A->>D: COMMIT
    A->>S: create Checkout Session (BDT, metadata consultationId, paymentId)
    alt Stripe fails
      A->>D: compensate: cancel consultation, free slot, delete payment
      A-->>C: 502 Payment provider unavailable
    else Stripe ok
      A-->>C: 201 consultation and paymentUrl
      C->>S: redirect to Checkout
      S-->>C: success redirect
      S->>A: POST /webhook checkout.session.completed (signed)
      A->>A: verify signature, check stripeEventId unseen
      A->>D: payment PAID, consultation paymentStatus PAID
      A-->>S: 200
      C->>A: GET /consultations/:id (poll until PAID)
      A-->>C: PAID
    end
  end
```

## 2.8 Middleware chain on a protected route

```mermaid
flowchart TD
  R["Incoming request"] --> H["helmet and CORS (allow FRONTEND_URL, credentials)"]
  H --> RL["Rate limiter (stricter on auth and OTP)"]
  RL --> CP["cookie-parser and JSON body (webhook uses raw body)"]
  CP --> LOG["Request id and pino-http logger"]
  LOG --> CA["checkAuth(roles)"]
  CA --> S1["1 Read session cookie and access token"]
  S1 --> S2["2 Find session in DB, not expired"]
  S2 --> S3["3 Load user: ACTIVE and not deleted"]
  S3 --> S4["4 needPasswordChange? allow only change-password"]
  S4 --> S5["5 Verify access JWT"]
  S5 --> S6["6 Role in allowed roles"]
  S6 --> V["validateRequest (Zod): on failure return next(error)"]
  V --> M["multer upload (only on upload routes): type and size checks"]
  M --> CT["controller via catchAsync"]
  CT --> SV["service: logic and Prisma"]
  SV --> SR["sendResponse"]
  CA -.->|"error"| NF["notFound (registered BEFORE error handler)"]
  V -.->|"error"| EH["globalErrorHandler: Zod, Prisma, JWT, AppError, cleanup uploads"]
  SV -.->|"error"| EH
  NF --> EH
```

## 2.9 Client behaviour (what the web app must do)

| Situation | Client behaviour |
|---|---|
| Access token expired (401 `TOKEN_EXPIRED`) | Call `POST /auth/refresh-token` once, retry the original request once; if refresh fails, clear state and go to `/login?redirect=<path>` |
| 401 `UNAUTHENTICATED` | Go to `/login?redirect=<path>` |
| 403 `FORBIDDEN` | Show a forbidden page, do not retry |
| `needPasswordChange` true on `/auth/me` | Lock navigation to `/change-password` until done |
| 409 slot taken on booking | Toast "Someone just booked this slot", refetch slots, keep the form data |
| After Stripe success redirect | Show "Confirming payment...", poll `GET /consultations/:id` every 2 s up to 30 s; if still UNPAID show "Payment received, confirmation may take a minute" and a refresh button |
| Stripe cancel redirect | Return to the consultation with "Payment pending, pay within X minutes" countdown from `createdAt + 30 min` |
| Pay later | Show a visible countdown; at zero show "Booking expired" |
| Time display | Convert ISO UTC to Asia/Dhaka for display only |
| Cookies | `credentials: 'include'` on every API call; no tokens in localStorage |
| Form errors | Map `errorSources[].path` to fields |
| Double submit | Disable the button while a mutation is in flight; send an idempotency-safe request (server also protects) |
| Uploads | Check type (PDF) and size (5 MB) before upload; show progress |

## 2.10 Authentication error cases

| Case | HTTP | `code` | Message | Client action |
|---|---|---|---|---|
| No cookie or token | 401 | `UNAUTHENTICATED` | Please log in | Go to login |
| Access token expired | 401 | `TOKEN_EXPIRED` | Session expired | Refresh and retry once |
| Invalid or tampered token | 401 | `INVALID_TOKEN` | Invalid token | Go to login |
| Session missing or expired in DB | 401 | `SESSION_EXPIRED` | Please log in again | Go to login |
| Wrong email or password | 401 | `INVALID_CREDENTIALS` | Email or password is incorrect (same text for both) | Show on form, no hint which |
| Email not verified | 403 | `EMAIL_NOT_VERIFIED` | Verify your email | Go to verify-email, resend OTP |
| OTP wrong | 400 | `OTP_INVALID` | Incorrect code | Show attempts left |
| OTP expired (2 min) | 400 | `OTP_EXPIRED` | Code expired | Offer resend |
| OTP attempts exceeded | 429 | `OTP_LOCKED` | Too many attempts, try later | Disable form with timer |
| Too many login attempts | 429 | `RATE_LIMITED` | Try again later | Show retry-after |
| User blocked | 403 | `USER_BLOCKED` | Account blocked, contact support | Show support page |
| User deleted | 401 | `USER_NOT_FOUND` | Account not found | Go to register |
| Role not allowed | 403 | `FORBIDDEN` | You do not have access | Forbidden page |
| Must change password | 403 | `PASSWORD_CHANGE_REQUIRED` | Change your password to continue | Force change-password screen |
| Google OAuth failed or cancelled | 302 | `OAUTH_FAILED` | Redirect to `/login?error=oauth` | Show message |
| Google account email unverified | 403 | `OAUTH_EMAIL_UNVERIFIED` | Cannot sign in with this Google account | Show message |
| Reset link or OTP reuse | 400 | `OTP_INVALID` | Code already used | Request new code |

---

# 3. Business Logic Flow

## 3.1 Booking decision flow

```mermaid
flowchart TD
  A["Client clicks Book on a slot"] --> B{"Logged in as CLIENT?"}
  B -- No --> L["Go to login, then return"]
  B -- Yes --> C{"Email verified and account ACTIVE?"}
  C -- No --> X1["Block: verify email or account blocked"]
  C -- Yes --> D{"Lawyer verified and not deleted?"}
  D -- No --> X2["404 Lawyer not found"]
  D -- Yes --> E{"Slot in the future and offered by lawyer?"}
  E -- No --> X3["400 Slot unavailable"]
  E -- Yes --> F{"Client has overlapping active consultation?"}
  F -- Yes --> X4["409 You already have a consultation at this time"]
  F -- No --> G["Atomic slot lock: updateMany isBooked false to true"]
  G --> H{"count = 1?"}
  H -- No --> X5["409 Slot already booked"]
  H -- Yes --> I["Create consultation and payment (one transaction)"]
  I --> J{"Pay now or pay later?"}
  J -- Pay now --> K["Create Stripe Checkout session and redirect"]
  J -- Pay later --> M["Return consultation. 30 minute payment window starts"]
  K --> N["Webhook marks PAID"]
  M --> O{"Paid within 30 minutes?"}
  O -- Yes --> N
  O -- No --> P["Cron cancels, frees slot, removes unpaid payment"]
```

## 3.2 Consultation status lifecycle

```mermaid
stateDiagram-v2
  [*] --> SCHEDULED: booked, slot locked
  SCHEDULED --> INPROGRESS: lawyer or admin starts
  SCHEDULED --> CANCELED: client, lawyer, admin, or unpaid timeout
  INPROGRESS --> COMPLETED: lawyer or admin completes
  COMPLETED --> [*]
  CANCELED --> [*]
```

| Status | Payment status possible | Who can move it | Allowed next |
|---|---|---|---|
| SCHEDULED | UNPAID, PAID | Lawyer (own), Client (cancel own), Admin, Cron (unpaid only) | INPROGRESS, CANCELED |
| INPROGRESS | PAID | Lawyer (own), Admin | COMPLETED |
| COMPLETED | PAID | none | none (final) |
| CANCELED | UNPAID, REFUNDED | none | none (final) |

Rules: a consultation cannot be INPROGRESS while UNPAID (pay-later clients must pay first). Cancelling frees the slot. A cancelled slot can be booked again (partial unique index).

## 3.3 Paid booking, step by step

1. Client opens a lawyer, picks type, slot, optional topic, chooses **Pay now**.
2. API checks auth, role, input, lawyer verified, slot in future, no client overlap.
3. Transaction: atomic slot lock; create Consultation (SCHEDULED, UNPAID, new `videoCallingId`); create Payment (UNPAID, `amount = lawyer.consultationFee`, new `transactionId`). Commit.
4. Outside the transaction: create Stripe Checkout session (BDT, metadata with ids, success and cancel URLs). On failure run compensation (cancel, free slot, delete payment).
5. Client is redirected to Stripe and pays.
6. Stripe sends `checkout.session.completed` to `/webhook`.
7. API verifies the signature on the raw body, stores `stripeEventId` (unique) to ignore replays, sets Payment PAID and Consultation paymentStatus PAID in one transaction.
8. API sends confirmation email to client and lawyer `[P3]`.
9. Client returns to the app, polls until PAID, sees the consultation with the join details.
10. If not paid within 30 minutes: cron cancels, deletes the unpaid payment, frees the slot.

## 3.4 Lawyer invitation flow

```mermaid
flowchart TD
  A["Admin fills Create Lawyer: name, email, contact, Bar Council no, fee, practice areas"] --> B{"Admin or Super Admin?"}
  B -- No --> X["403"]
  B -- Yes --> C{"Email and Bar Council no unique?"}
  C -- No --> Y["409 duplicate"]
  C -- Yes --> D["Transaction: create User (role LAWYER, needPasswordChange true), Lawyer (isVerified false), LawyerPracticeArea rows"]
  D --> E["Send invitation email with temporary password and login link"]
  E --> F["Lawyer logs in with temporary password"]
  F --> G["Forced change-password screen"]
  G --> H["emailVerified set true after change"]
  H --> I["Lawyer completes profile: photo, bio, chamber, languages"]
  I --> J["Admin reviews Bar Council number"]
  J --> K{"Approve?"}
  K -- Yes --> V["isVerified true, verifiedAt set, listed publicly"]
  K -- No --> R["Stays hidden with verificationNote; lawyer notified"]
```

Temporary password: random, 12+ characters, shown only in the email, never logged, invalid after first change.

## 3.5 Lawyer moderation flow (managing own consultations)

The lawyer controls the lifecycle of consultations booked with them:

1. **View**: today and upcoming consultations, client name, type, topic, payment status, uploaded documents.
2. **Start**: allowed only when SCHEDULED and PAID, near the slot time (from 10 minutes before). Moves to INPROGRESS.
3. **Complete**: from INPROGRESS only. Enables the advice note and the client's review.
4. **Cancel**: allowed while SCHEDULED. If PAID the system refunds in full automatically (Payment REFUNDED), frees the slot, emails the client.
5. **Advice note**: write once per consultation after INPROGRESS: summary, next steps, optional follow-up date. Client can read it. The lawyer cannot edit after 24 hours `Assumption`.
6. **Documents**: read only the PDFs uploaded to that consultation. Every read is logged `[P2]`.
7. **Availability**: add or remove own slots; booked slots cannot be removed.

A lawyer cannot: change a COMPLETED or CANCELED consultation, see other lawyers' consultations, edit their own `isVerified`, `consultationFee` history on past payments, or reviews.

## 3.6 Review flow

```mermaid
flowchart TD
  A["Consultation COMPLETED"] --> B["Client sees Write review"]
  B --> C{"Own consultation, no review yet, within 30 days?"}
  C -- No --> X["403 or 409"]
  C -- Yes --> D["Rating 1 to 5 and optional comment up to 1000 chars"]
  D --> E["Transaction: create Review, recompute lawyer averageRating from visible reviews"]
  E --> F["Review shown on lawyer profile"]
  F --> G{"Admin flags or hides?"}
  G -- Yes --> H["isHidden true with reason in AuditLog, average recomputed"]
```

Clients cannot edit a review `Assumption` (keeps ratings trustworthy). They can ask an Admin to hide one.

## 3.7 Admin moderation flow

| Task | Steps | Result |
|---|---|---|
| Verify lawyer | Open pending list -> check Bar Council number and details -> Approve or Reject with note | `isVerified`, `verifiedAt`, `verificationNote`; AuditLog `LAWYER_VERIFIED` or `LAWYER_REJECTED` |
| Un-verify lawyer | Open lawyer -> Revoke with reason | Hidden from public; existing SCHEDULED consultations stay and the Admin is warned to handle them |
| Hide review | Review queue -> Hide with reason | `isHidden = true`; rating recalculated; AuditLog `REVIEW_HIDDEN` |
| Block user | Users list -> Block with reason | `User.status = BLOCKED`; all sessions revoked; blocked lawyer disappears from public list; open consultations flagged for Admin |
| Unblock user | Users list -> Unblock | `status = ACTIVE` |
| Cancel consultation (exceptional) | Consultation row -> Cancel with reason | Valid transition only; refund per rule BR-12; AuditLog |
| Manual refund | Payment row -> Refund | Stripe refund, `REFUNDED`; AuditLog |
| Manage Admins | Super Admin only | Create, update, soft delete; never create a Super Admin through the API |

Admins never see document contents or advice text. Metadata only.

---

# 4. Core Functionality

## 4.1 Authentication and access

| ID | Requirement | Phase |
|---|---|---|
| AUTH-1 | Client registers with name, email, password. User and Client are created in one transaction; rollback on failure | P1 |
| AUTH-2 | Login issues access JWT (1 day), refresh JWT (7 days), Better Auth session cookie. All httpOnly, secure in production | P1 |
| AUTH-3 | Email verification by 6-digit OTP, valid 2 minutes, single use, 5 attempts | P1 |
| AUTH-4 | Forgot and reset password by OTP; reset revokes all sessions | P1 |
| AUTH-5 | Refresh endpoint rotates tokens | P1 |
| AUTH-6 | Google OAuth; first login creates a Client | P1 |
| AUTH-7 | `GET /auth/me`, change password, logout | P1 |
| AUTH-8 | Blocked or deleted users are rejected on every request | P1 |
| AUTH-9 | Super Admin seeded from env on first start | P1 |
| AUTH-10 | Session lifetime matches documented value (PH gap: 60 days vs 1 day) | P1 |
| AUTH-11 | Rate limit: login 10 per 15 min per IP and email; OTP send 3 per 10 min | P1 |
| USR-1 | Create Lawyer (profile plus at least one practice area, atomic). Admin, Super Admin only | P1 |
| USR-2 | Create Admin: Super Admin only. Creating a Super Admin via API is forbidden | P1 |
| USR-3 | Update and soft-delete Admin: Super Admin only; compare `admin.userId` correctly | P1 |
| USR-4 | Block and unblock user (Admin, Super Admin); Admin cannot block Admin or Super Admin | P2 |

Access matrix

| Capability | Public | Client | Lawyer | Admin | Super Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Register, login, reset password | Y | | | | |
| Browse verified lawyers and practice areas | Y | | | | |
| Book, pay, cancel own booking | | Y | | | |
| View own consultations | | Y | Y | | |
| Manage own availability | | | Y | | |
| Start, complete, cancel own consultations | | | Y | | |
| Write advice | | | Y | | |
| Upload documents | | Y | | | |
| Read documents and advice of own consultation | | Y | Y | | |
| Submit review | | Y | | | |
| Create lawyer, verify lawyer | | | | Y | Y |
| Practice areas and schedules CRUD | | | | Y | Y |
| View all consultations (metadata) | | | | Y | Y |
| Hide reviews, block users | | | | Y | Y |
| View audit log | | | | Y | Y |
| Create, update, delete Admin | | | | | Y |

## 4.2 Discovery and homepage

| ID | Requirement |
|---|---|
| DIS-1 | Public lawyer list returns only `isVerified = true AND isDeleted = false AND user.status = ACTIVE` |
| DIS-2 | Search term matches name, bio, practice-area title |
| DIS-3 | Filters: practice area, gender, fee min and max, experience min, language, minimum rating, has availability in next 7 days |
| DIS-4 | Sort by rating, fee, experience, soonest availability; pagination `page`, `limit` (max 100) |
| DIS-5 | Lawyer detail includes practice areas, rating, review count, upcoming free slots, public fields only (Bar Council number masked) |
| DIS-6 | Homepage data endpoint: top-rated lawyers (rating at least 4 with at least 3 reviews), practice areas with lawyer counts |
| DIS-7 | Public pages server-rendered with SEO metadata and the disclaimer |

## 4.3 Consultations and scheduling

| ID | Requirement |
|---|---|
| SCH-1 | Admin creates schedules: date range plus daily start and end; system generates 30-minute slots in UTC, skipping duplicates |
| SCH-2 | A schedule slot with any booked lawyer-slot cannot be deleted |
| SCH-3 | Lawyer picks, lists, removes own slots; booked slots cannot be removed; past slots cannot be picked |
| CON-1 | Book (pay now): lock slot, create consultation and payment, return Stripe URL |
| CON-2 | Book (pay later); pay afterwards by `POST /consultations/:id/pay` |
| CON-3 | Unique `videoCallingId` (UUIDv7) per consultation |
| CON-4 | Client and Lawyer see own; Admin sees all (metadata) |
| CON-5 | Status transitions follow section 3.2, with actor ownership checks |
| CON-6 | Cron every 25 minutes cancels consultations unpaid 30+ minutes, deletes unpaid payment, frees slot |
| CON-7 | Atomic slot lock plus partial unique index `(lawyerId, scheduleId) WHERE status <> 'CANCELED'` |
| CON-8 | No Stripe or network calls inside DB transactions |
| CON-9 | Reject booking if lawyer not verified, deleted, or slot in the past |
| CON-10 | Lawyer cancel of paid consultation refunds in full; client cancel follows BR-12 |
| CON-11 | Client cannot hold overlapping active consultations |
| CON-12 | Advice note: one per consultation, lawyer only, after INPROGRESS; client reads |
| CON-13 | Documents: client uploads PDF (max 5 MB, up to 5 per consultation); only that client and lawyer read |

## 4.4 Payments

| ID | Requirement | Phase |
|---|---|---|
| PAY-1 | Stripe Checkout in BDT, amount = lawyer fee at booking time (snapshot on Payment) | P1 |
| PAY-2 | `POST /webhook` with raw body; verify signature; reject if invalid | P1 |
| PAY-3 | `checkout.session.completed` sets Payment and Consultation PAID | P1 |
| PAY-4 | Idempotent: unique `stripeEventId`; replays return 200 without changes | P1 |
| PAY-5 | `checkout.session.expired` and `payment_intent.payment_failed` are logged; booking stays until cron timeout | P1 |
| PAY-6 | Refund via Stripe refund API; Payment `REFUNDED`; store `refundId`; refund amount follows BR-12 | P3 |
| PAY-7 | `PaymentGateway` interface (`createCheckout`, `verifyWebhook`, `refund`) with a Stripe implementation | P1 |
| PAY-8 | Payment records are never hard-deleted once PAID; only UNPAID rows of cancelled bookings are removed | P1 |
| PAY-9 | Amount mismatch between webhook and stored payment raises an alert and does not mark PAID | P1 |

## 4.5 Reviews and ratings

| ID | Requirement |
|---|---|
| REV-1 | Only the client of a COMPLETED consultation may review, once, within 30 days of completion |
| REV-2 | Rating integer 1 to 5 (Zod and DB `CHECK`), comment up to 1000 chars, no HTML |
| REV-3 | Lawyer `averageRating` recalculated in the same transaction as the review, using aggregate over `isHidden = false` |
| REV-4 | Public lawyer page lists non-hidden reviews with client first name and initial only |
| REV-5 | Admin can hide or unhide a review with a reason; AuditLog written; rating recalculated |
| REV-6 | Lawyers cannot edit, hide, or delete reviews |

## 4.6 Dashboard and settings

| ID | Requirement |
|---|---|
| DSH-1 | Client overview: counts of upcoming, unpaid, completed; next consultation; unpaid countdown |
| DSH-2 | Lawyer overview: today's consultations, week count, completed count, rating, next free slots |
| DSH-3 | Admin overview: totals (clients, lawyers, pending verification), consultations today, revenue this month (PAID minus REFUNDED), flagged reviews |
| DSH-4 | Consultation list with filters (status, payment status, date range, lawyer or client) and pagination |
| SET-1 | Update own profile (name, contact, photo; lawyers also bio, fee, chamber, languages, practice areas) |
| SET-2 | Change password (requires current password; revokes other sessions) |
| SET-3 | Profile photo upload (JPEG, PNG, WebP up to 2 MB) via Cloudinary; old asset removed |
| SET-4 | Lawyer fee change applies to future bookings only |
| SET-5 | Account deletion request (Client): soft delete, blocked if an active consultation exists |

## 4.7 Admin

| ID | Requirement |
|---|---|
| ADM-1 | Create, update, soft delete Lawyers; verify, reject, revoke |
| ADM-2 | Practice areas: create with icon upload, update, soft delete (blocked if it would leave a lawyer with none) |
| ADM-3 | Schedules CRUD (SCH-1, SCH-2) |
| ADM-4 | Consultations list (metadata only), exceptional cancel with reason |
| ADM-5 | Review moderation (REV-5) |
| ADM-6 | Block and unblock users (USR-4) |
| ADM-7 | Audit log viewer with filters (actor, action, entity, date) |
| ADM-8 | Super Admin: Admin management (USR-2, USR-3) |

## 4.8 Quality requirements

| Area | Requirement |
|---|---|
| Security | httpOnly secure cookies, Zod on every input, role guards on every protected route, webhook signature check, helmet, strict CORS, rate limits, no secrets in repo, dependency audit in CI |
| Privacy | Documents and advice confidential; least privilege; audit log for any exceptional access; no personal data in logs |
| Reliability | Multi-step writes in transactions; idempotent webhook; DB guard against double booking; cron safe to run twice |
| Performance | Lawyer search p95 under 300 ms at 10,000 lawyers; indexed filters; no N+1 queries; list responses paginated |
| Availability | Health endpoint `GET /health` (DB check); graceful shutdown; target 99.5% |
| Accessibility | WCAG 2.1 AA on the client |
| i18n | Bangla and English UI; API messages in English with stable `code` values |
| Observability | pino JSON logs with request id; error tracking (Sentry or similar); cron run summaries |
| Testing | Unit tests for services; integration tests for booking race, status rules, webhook idempotency, auth matrix; at least 80% coverage on services |
| Maintainability | Module pattern; ESLint and Prettier; no empty files; `notFound` before `globalErrorHandler` |
| Data | Daily DB backups, 14-day retention, restore tested once before launch |

## 4.9 Product Data Model (PRD style)

| Entity | Purpose | Key fields | Notes |
|---|---|---|---|
| User | Login identity for all roles | email, role, status, needPasswordChange, emailVerified, isDeleted | One per person; Better Auth owns Session, Account, Verification |
| Client | Client profile | name, contactNumber, profilePhoto, address | 1:1 with User |
| Lawyer | Lawyer profile | barCouncilNo, consultationFee, experience, chamberAddress, languages, isVerified, averageRating | 1:1 with User; hidden until verified |
| Admin | Admin profile | name, contactNumber | 1:1 with User (Admin and Super Admin) |
| PracticeArea | Category such as Family or Cyber | title, icon | Many-to-many with Lawyer |
| Schedule | A global 30-minute slot | startDateTime, endDateTime | UTC; unique per start and end |
| LawyerSchedule | Slot a lawyer offers | isBooked | Composite key (lawyerId, scheduleId) |
| Consultation | A booking | type, status, paymentStatus, videoCallingId, topic | Partial unique on active slot |
| Payment | Money for a consultation | amount, status, transactionId, stripeEventId, refundId, refundedAmount | 1:1 with Consultation |
| LegalAdvice | Lawyer's note after consultation | summary, nextSteps, followUpDate | 1:1 with Consultation |
| CaseDocument | Uploaded PDF | title, fileUrl, publicId | N per Consultation |
| Review | Rating and comment | rating, comment, isHidden | 1:1 with Consultation |
| AuditLog | Who did what | actorId, action, entity, entityId, reason | Append only |

## 4.10 Prisma schema (reference)

Prisma 7 note: the connection URL lives in `prisma.config.ts`; the client uses `@prisma/adapter-pg`. Split these into `prisma/schema/*.prisma` by domain.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ───────── Enums ─────────
enum Role {
  SUPER_ADMIN
  ADMIN
  LAWYER
  CLIENT
}

enum UserStatus {
  ACTIVE
  BLOCKED
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum ConsultationType {
  VIDEO
  CHAMBER
  PHONE
}

enum ConsultationStatus {
  SCHEDULED
  INPROGRESS
  COMPLETED
  CANCELED
}

enum PaymentStatus {
  UNPAID
  PAID
  REFUNDED
}

// ───────── Identity (Better Auth owns Session, Account, Verification) ─────────
model User {
  id                 String     @id @default(uuid(7))
  name               String
  email              String     @unique
  emailVerified      Boolean    @default(false)
  image              String?
  role               Role       @default(CLIENT)
  status             UserStatus @default(ACTIVE)
  needPasswordChange Boolean    @default(false)
  isDeleted          Boolean    @default(false)
  deletedAt          DateTime?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  sessions Session[]
  accounts Account[]
  client   Client?
  lawyer   Lawyer?
  admin    Admin?

  @@index([role, status, isDeleted])
}

model Session {
  id        String   @id @default(uuid(7))
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model Account {
  id                    String    @id @default(uuid(7))
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
}

model Verification {
  id         String   @id @default(uuid(7))
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
}

// ───────── Profiles ─────────
model Client {
  id            String    @id @default(uuid(7))
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  name          String
  email         String    @unique
  profilePhoto  String?
  contactNumber String?
  address       String?
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  consultations Consultation[]
  reviews       Review[]
  documents     CaseDocument[]

  @@index([isDeleted])
}

model Admin {
  id            String    @id @default(uuid(7))
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  name          String
  email         String    @unique
  profilePhoto  String?
  contactNumber String?
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([isDeleted])
}

model Lawyer {
  id               String    @id @default(uuid(7))
  userId           String    @unique
  user             User      @relation(fields: [userId], references: [id])
  name             String
  email            String    @unique
  profilePhoto     String?
  contactNumber    String
  gender           Gender
  barCouncilNo     String    @unique
  experience       Int       @default(0)
  consultationFee  Int // integer BDT
  chamberAddress   String?
  languages        String[]
  bio              String?
  isVerified       Boolean   @default(false)
  verifiedAt       DateTime?
  verificationNote String?
  averageRating    Float     @default(0)
  reviewCount      Int       @default(0)
  isDeleted        Boolean   @default(false)
  deletedAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  practiceAreas LawyerPracticeArea[]
  schedules     LawyerSchedule[]
  consultations Consultation[]
  reviews       Review[]

  @@index([isDeleted, isVerified])
  @@index([averageRating])
  @@index([consultationFee])
}

// ───────── Catalog ─────────
model PracticeArea {
  id        String    @id @default(uuid(7))
  title     String    @unique
  icon      String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())

  lawyers LawyerPracticeArea[]
}

model LawyerPracticeArea {
  lawyerId       String
  practiceAreaId String
  lawyer         Lawyer       @relation(fields: [lawyerId], references: [id])
  practiceArea   PracticeArea @relation(fields: [practiceAreaId], references: [id])

  @@id([lawyerId, practiceAreaId])
  @@index([practiceAreaId])
}

// ───────── Scheduling ─────────
model Schedule {
  id            String   @id @default(uuid(7))
  startDateTime DateTime // UTC
  endDateTime   DateTime // UTC
  isDeleted     Boolean  @default(false)
  createdAt     DateTime @default(now())

  lawyerSchedules LawyerSchedule[]

  @@unique([startDateTime, endDateTime])
  @@index([startDateTime])
}

model LawyerSchedule {
  lawyerId   String
  scheduleId String
  isBooked   Boolean  @default(false)
  lawyer     Lawyer   @relation(fields: [lawyerId], references: [id])
  schedule   Schedule @relation(fields: [scheduleId], references: [id])
  createdAt  DateTime @default(now())

  consultations Consultation[] // many over time; at most one active (partial unique index)

  @@id([lawyerId, scheduleId])
  @@index([scheduleId])
  @@index([lawyerId, isBooked])
}

// ───────── Booking ─────────
model Consultation {
  id             String             @id @default(uuid(7))
  clientId       String
  lawyerId       String
  scheduleId     String
  type           ConsultationType   @default(VIDEO)
  status         ConsultationStatus @default(SCHEDULED)
  paymentStatus  PaymentStatus      @default(UNPAID)
  videoCallingId String             @unique
  topic          String?
  canceledAt     DateTime?
  canceledBy     Role?
  cancelReason   String?
  completedAt    DateTime?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  client         Client         @relation(fields: [clientId], references: [id])
  lawyer         Lawyer         @relation(fields: [lawyerId], references: [id])
  lawyerSchedule LawyerSchedule @relation(fields: [lawyerId, scheduleId], references: [lawyerId, scheduleId])
  payment        Payment?
  advice         LegalAdvice?
  review         Review?
  documents      CaseDocument[]

  // NOTE: partial unique index added by raw SQL in a migration (see 4.12):
  // CREATE UNIQUE INDEX "consultation_active_slot_uq"
  //   ON "Consultation" ("lawyerId", "scheduleId") WHERE status <> 'CANCELED';
  @@index([clientId, status])
  @@index([lawyerId, status])
  @@index([status, paymentStatus, createdAt])
}

model Payment {
  id               String        @id @default(uuid(7))
  consultationId   String        @unique
  consultation     Consultation  @relation(fields: [consultationId], references: [id])
  amount           Int // integer BDT, snapshot of fee at booking
  status           PaymentStatus @default(UNPAID)
  transactionId    String        @unique
  stripeEventId    String?       @unique
  stripeSessionId  String?       @unique
  paymentGatewayData Json?
  refundId         String?
  refundedAmount   Int           @default(0)
  paidAt           DateTime?
  refundedAt       DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([status, createdAt])
}

model LegalAdvice {
  id             String       @id @default(uuid(7))
  consultationId String       @unique
  consultation   Consultation @relation(fields: [consultationId], references: [id])
  summary        String
  nextSteps      String?
  followUpDate   DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model CaseDocument {
  id             String       @id @default(uuid(7))
  consultationId String
  clientId       String
  consultation   Consultation @relation(fields: [consultationId], references: [id])
  client         Client       @relation(fields: [clientId], references: [id])
  title          String
  fileUrl        String
  publicId       String // Cloudinary id for cleanup
  sizeBytes      Int
  createdAt      DateTime     @default(now())

  @@index([consultationId])
  @@index([clientId])
}

model Review {
  id             String       @id @default(uuid(7))
  consultationId String       @unique
  consultation   Consultation @relation(fields: [consultationId], references: [id])
  clientId       String
  lawyerId       String
  client         Client       @relation(fields: [clientId], references: [id])
  lawyer         Lawyer       @relation(fields: [lawyerId], references: [id])
  rating         Int // 1..5, also DB CHECK
  comment        String?
  isHidden       Boolean      @default(false)
  createdAt      DateTime     @default(now())

  @@index([lawyerId, isHidden, createdAt])
  @@index([clientId])
}

// ───────── Audit ─────────
model AuditLog {
  id        String   @id @default(uuid(7))
  actorId   String
  actorRole Role
  action    String // e.g. LAWYER_VERIFIED, REVIEW_HIDDEN, DOCUMENT_READ
  entity    String
  entityId  String
  reason    String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([entity, entityId])
  @@index([actorId, createdAt])
  @@index([action, createdAt])
}
```

## 4.11 Relationships

| Relationship | Type | On delete |
|---|---|---|
| User -> Client, Lawyer, Admin | 1:1 (one profile per role) | Restrict (soft delete only) |
| User -> Session, Account | 1:N | Cascade |
| Lawyer <-> PracticeArea | N:M via LawyerPracticeArea | Restrict |
| Lawyer <-> Schedule | N:M via LawyerSchedule | Restrict |
| LawyerSchedule -> Consultation | 1:N over time, 1 active | Restrict |
| Client -> Consultation | 1:N | Restrict |
| Lawyer -> Consultation | 1:N | Restrict |
| Consultation -> Payment, LegalAdvice, Review | 1:1 each | Restrict |
| Consultation -> CaseDocument | 1:N | Restrict |
| Lawyer -> Review | 1:N | Restrict |

## 4.12 Constraints and indexes

| Constraint | Purpose |
|---|---|
| `User.email` unique, `Lawyer.barCouncilNo` unique, `Lawyer.email`, `Client.email`, `Admin.email` unique | Identity integrity |
| `Consultation.videoCallingId` unique | One call room per consultation |
| **Partial unique** `(lawyerId, scheduleId) WHERE status <> 'CANCELED'` | One active booking per slot; allows rebooking after cancel |
| `Payment.consultationId`, `transactionId`, `stripeEventId`, `stripeSessionId` unique | One payment per consultation; webhook idempotency |
| `Review.consultationId` unique | One review per consultation |
| `LegalAdvice.consultationId` unique | One advice note per consultation |
| `Schedule (startDateTime, endDateTime)` unique | No duplicate slots |
| `CHECK (rating BETWEEN 1 AND 5)` on Review | Data validity beyond Zod |
| `CHECK ("consultationFee" > 0)` on Lawyer | No free or negative fees |
| `CHECK ("refundedAmount" <= "amount")` on Payment | Refund sanity |

Migration SQL (add manually in a dedicated migration, then run `prisma migrate diff` in CI to be sure Prisma does not try to drop it):

```sql
CREATE UNIQUE INDEX "consultation_active_slot_uq"
  ON "Consultation" ("lawyerId", "scheduleId")
  WHERE "status" <> 'CANCELED';

ALTER TABLE "Review"   ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Lawyer"   ADD CONSTRAINT "lawyer_fee_positive"  CHECK ("consultationFee" > 0);
ALTER TABLE "Payment"  ADD CONSTRAINT "payment_refund_lte"   CHECK ("refundedAmount" <= "amount");
```

Query indexes: `Lawyer(isDeleted, isVerified)`, `Lawyer(averageRating)`, `Lawyer(consultationFee)`, `LawyerSchedule(lawyerId, isBooked)`, `Consultation(status, paymentStatus, createdAt)` for the cron, `Review(lawyerId, isHidden, createdAt)`, `AuditLog(entity, entityId)`.

---

# 5. Business Rules

Policy rules that product owners decide. `Assumption` marks defaults to confirm.

| ID | Rule |
|---|---|
| BR-1 | Slot length is fixed at 30 minutes |
| BR-2 | A lawyer appears publicly only when verified, not deleted, and not blocked |
| BR-3 | Fee is set by the lawyer's profile (Admin may edit); a booking keeps the fee at booking time |
| BR-4 | Pay now or pay later; pay-later bookings expire 30 minutes after creation |
| BR-5 | A paid booking cannot be started before payment is confirmed by webhook |
| BR-6 | Clients cannot book slots in the past or less than 30 minutes ahead `Assumption` |
| BR-7 | A client cannot hold two active (SCHEDULED or INPROGRESS) consultations with overlapping times |
| BR-8 | Different slots with the same lawyer are allowed |
| BR-9 | Lawyers cannot book or review themselves; a user has one role |
| BR-10 | Documents: PDF only, 5 MB each, max 5 per consultation, uploaded only while status is SCHEDULED or INPROGRESS |
| BR-11 | Advice note is written once after INPROGRESS; editable by the lawyer for 24 hours `Assumption` |
| BR-12 | Refunds `Assumption`: lawyer or Admin cancel -> 100%. Client cancel 24 hours or more before the slot -> 100%. Client cancel under 24 hours -> 0%. Unpaid booking cancel -> nothing to refund |
| BR-13 | Reviews: completed consultations only, once, within 30 days, rating 1 to 5, not editable by the client |
| BR-14 | Lawyers can start a consultation from 10 minutes before the slot until the end of the slot |
| BR-15 | If a lawyer does not start a PAID consultation within 30 minutes after slot end, the system marks it CANCELED with full refund `[P3]` `Assumption` |
| BR-16 | Practice area cannot be deleted if it would leave any lawyer with zero areas |
| BR-17 | A lawyer's own slots can be removed only while unbooked |
| BR-18 | Blocked users cannot log in; their sessions are revoked immediately |
| BR-19 | Super Admin cannot be created, edited, blocked, or deleted through the API |
| BR-20 | The disclaimer text is shown at booking and on every lawyer page: "This is a preliminary consultation, not formal legal representation." |
| BR-21 | Case documents and advice are visible only to that consultation's client and lawyer; Admin access is not provided in v1 |
| BR-22 | Payment records are kept at least 7 years `Assumption`; case documents deleted on client request after the retention period decided in Q5 |

---

# 6. API Endpoints

Base path: `/api/v1`. Auth column: `P` public, `C` client, `L` lawyer, `A` admin, `S` super admin, `Any` any logged-in user.

## Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /auth/register | P | Register client |
| POST | /auth/login | P | Email and password login |
| POST | /auth/verify-email | P | Verify OTP |
| POST | /auth/resend-otp | P | Resend OTP (rate limited) |
| POST | /auth/forget-password | P | Send reset OTP |
| POST | /auth/reset-password | P | Reset with OTP |
| POST | /auth/refresh-token | P (cookie) | Rotate tokens |
| POST | /auth/logout | Any | Clear cookies and session |
| POST | /auth/change-password | Any | Change password |
| GET | /auth/me | Any | Current user and profile |
| GET | /auth/login/google | P | Start Google OAuth |
| GET | /auth/google/success | P | OAuth completion redirect |

## Users, profiles
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /users/create-lawyer | A, S | Create lawyer (invitation) |
| POST | /users/create-admin | S | Create admin |
| PATCH | /users/:id/status | A, S | Block or unblock |
| GET | /clients/me | C | Own profile |
| PATCH | /clients/me | C | Update profile (multipart for photo) |
| DELETE | /clients/me | C | Soft delete own account |
| GET | /admins | S | List admins |
| GET | /admins/:id | S | Admin details |
| PATCH | /admins/:id | S | Update admin |
| DELETE | /admins/:id | S | Soft delete admin |

## Lawyers
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /lawyers | P | List verified lawyers (search, filters, sort, pagination) |
| GET | /lawyers/top | P | Homepage top-rated |
| GET | /lawyers/:id | P | Details (public fields) |
| GET | /lawyers/:id/slots | P | Free upcoming slots (query: from, to) |
| GET | /lawyers/:id/reviews | P | Visible reviews |
| GET | /lawyers/admin/list | A, S | All lawyers incl. unverified |
| PATCH | /lawyers/:id | A, S, L (own) | Update profile and practice areas |
| PATCH | /lawyers/:id/verify | A, S | Verify, reject, or revoke with note |
| DELETE | /lawyers/:id | A, S | Soft delete |

## Practice areas
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /practice-areas | P | List |
| POST | /practice-areas | A, S | Create (icon upload) |
| PATCH | /practice-areas/:id | A, S | Update |
| DELETE | /practice-areas/:id | A, S | Soft delete |

## Schedules and availability
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /schedules | A, S | Generate slots |
| GET | /schedules | A, S, L | List |
| GET | /schedules/:id | A, S, L | Details |
| PATCH | /schedules/:id | A, S | Update |
| DELETE | /schedules/:id | A, S | Delete if unbooked |
| POST | /lawyer-schedules | L | Pick slots |
| GET | /lawyer-schedules/my | L | Own slots |
| DELETE | /lawyer-schedules/:scheduleId | L | Remove unbooked slot |

## Consultations
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /consultations/book | C | Book and get payment URL |
| POST | /consultations/book-pay-later | C | Book without paying |
| POST | /consultations/:id/pay | C | Start payment for pay-later booking |
| GET | /consultations/my | C, L | Own consultations (filters) |
| GET | /consultations | A, S | All, metadata only |
| GET | /consultations/:id | C, L (own), A, S (metadata) | Details |
| PATCH | /consultations/:id/status | L, C, A, S | Status transition per rules |
| POST | /consultations/:id/advice | L | Create advice |
| PATCH | /consultations/:id/advice | L | Edit within 24 hours |
| GET | /consultations/:id/advice | C, L (own) | Read advice |
| POST | /consultations/:id/documents | C | Upload PDF |
| GET | /consultations/:id/documents | C, L (own) | List documents (logged) |
| DELETE | /consultations/:id/documents/:docId | C | Delete own document while SCHEDULED or INPROGRESS |

## Payments
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /webhook | Stripe signature | Payment events (raw body) |
| POST | /payments/:id/refund | A, S | Manual refund with reason |
| GET | /payments | A, S | List (metadata) |

## Reviews
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /reviews | C | Create review |
| GET | /reviews | A, S | Moderation list (filters, flagged) |
| PATCH | /reviews/:id/visibility | A, S | Hide or unhide with reason |

## Dashboard, admin, system
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /dashboard/client | C | Overview data |
| GET | /dashboard/lawyer | L | Overview data |
| GET | /dashboard/admin | A, S | Stats |
| GET | /audit-logs | A, S | Audit log |
| GET | /health | P | Liveness and DB check |

---

# 7. Project Structure

```
legalease-api/
├── CLAUDE.md
├── .claude/{rules,agents,skills}/
├── docs/{PRD.md, API.md}
├── prisma/
│   ├── schema/{base,auth,user,lawyer,schedule,consultation,payment,review,audit}.prisma
│   └── migrations/
├── prisma.config.ts
├── src/
│   ├── server.ts                  # bootstrap, seed super admin, graceful shutdown
│   ├── app.ts                     # middleware order, routes, notFound, error handler
│   ├── app/
│   │   ├── config/{env.ts, multer.config.ts, cloudinary.config.ts, stripe.config.ts}
│   │   ├── lib/{auth.ts, prisma.ts, logger.ts}
│   │   ├── middleware/{checkAuth.ts, validateRequest.ts, rateLimit.ts, notFound.ts, globalErrorHandler.ts}
│   │   ├── errorHelpers/{AppError.ts, handleZodError.ts, handlePrismaError.ts}
│   │   ├── gateway/{PaymentGateway.ts, StripeGateway.ts}
│   │   ├── utils/{catchAsync.ts, sendResponse.ts, jwt.ts, token.ts, cookie.ts, email.ts, QueryBuilder.ts, time.ts}
│   │   ├── templates/{otp.ejs, invitation.ejs, bookingConfirmed.ejs, googleRedirect.ejs}
│   │   ├── jobs/{cancelUnpaid.job.ts, cancelNoShow.job.ts}
│   │   ├── routes/index.ts
│   │   └── module/
│   │       ├── auth/ user/ client/ admin/ lawyer/ practiceArea/
│   │       ├── schedule/ lawyerSchedule/ consultation/ advice/ document/
│   │       ├── payment/ review/ dashboard/ audit/
│   │       └── <each>: *.route.ts *.controller.ts *.service.ts *.validation.ts *.interface.ts *.test.ts
│   └── generated/prisma/
├── tests/{integration, e2e}/
├── .env.example                   # placeholders only
├── eslint.config.mjs, tsconfig.json, vitest.config.ts
└── package.json (pnpm)
```

---

# 8. Technical Specifications

| Topic | Specification |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript strict, ESM or CJS consistently |
| Framework | Express 5 (async errors propagate), `helmet`, `cors` with `FRONTEND_URL` and credentials |
| DB | PostgreSQL 16, Prisma 7 with `@prisma/adapter-pg`, connection pooling (PgBouncer or provider pool) |
| Auth | Better Auth (email and password, email OTP, Google); access JWT 1 d, refresh JWT 7 d; session lifetime set explicitly and tested |
| Cookies | `httpOnly`, `secure` in production, `sameSite: 'lax'` (same site) or `'none'` with secure (cross-site, document the choice) |
| Validation | Zod v4 schemas `{ body, query, params }` |
| Payments | Stripe Checkout (BDT) behind `PaymentGateway`; webhook with raw body; `stripeEventId` idempotency |
| Files | Multer memory storage -> Cloudinary; MIME allow-list (`application/pdf`; images for icons and photos); random public ids; cleanup on error |
| Email | Nodemailer SMTP with EJS templates; sent outside DB transactions |
| Jobs | node-cron: unpaid cancel every 25 min; no-show cancel every 15 min `[P3]`; reminders `[P3]`. Single instance only, or add a DB advisory lock if scaled |
| Time | Store UTC (`timestamptz`), compute slots with `date-fns` in UTC, present in Asia/Dhaka |
| IDs | UUIDv7 |
| Logging | pino and pino-http, request id header `x-request-id`, redact cookies and passwords |
| Testing | Vitest, Supertest, separate test DB, mocked `PaymentGateway` |
| CI | pnpm install, lint, typecheck, test, `prisma migrate diff` check, secret scan, `pnpm audit` |
| Frontend | Next.js App Router, Tailwind, shadcn/ui, TanStack Query, react-hook-form with Zod, `date-fns-tz`, next-intl |

---

# 9. Environment Variables

All values in `.env.example` must be placeholders.

```bash
# App
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/legalease

# Better Auth
BETTER_AUTH_SECRET=change_me_min_32_chars
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN=1d
BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE=1d

# JWT
ACCESS_TOKEN_SECRET=change_me
ACCESS_TOKEN_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=change_me_too
REFRESH_TOKEN_EXPIRES_IN=7d

# Super Admin seed
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=change_me_strong

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/success

# Email (SMTP)
EMAIL_SENDER_SMTP_HOST=smtp.example.com
EMAIL_SENDER_SMTP_PORT=587
EMAIL_SENDER_SMTP_USER=your_smtp_user
EMAIL_SENDER_SMTP_PASS=your_smtp_password
EMAIL_SENDER_SMTP_FROM="LegalEase <no-reply@example.com>"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payments (Stripe, test mode for learning)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
PAYMENT_CURRENCY=bdt

# Business config
UNPAID_CANCEL_MINUTES=30
MIN_BOOKING_LEAD_MINUTES=30
CLIENT_FULL_REFUND_HOURS=24
REVIEW_WINDOW_DAYS=30
OTP_EXPIRES_MINUTES=2

# Frontend (separate app)
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

# 10. Dependencies

Install the latest compatible versions with pnpm and lock them.

| Group | Packages |
|---|---|
| Runtime | `express` (v5), `cors`, `helmet`, `cookie-parser`, `express-rate-limit`, `dotenv`, `http-status`, `qs`, `ms` |
| Database | `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` |
| Auth | `better-auth`, `jsonwebtoken` |
| Validation | `zod` (v4) |
| Payments | `stripe` |
| Files | `multer`, `cloudinary` |
| Email | `nodemailer`, `ejs` |
| Jobs | `node-cron` |
| Utilities | `date-fns`, `uuid` (v7) |
| Logging | `pino`, `pino-http` |
| Dev | `typescript`, `tsx`, `@types/*`, `eslint`, `prettier`, `vitest`, `supertest`, `@types/supertest` |
| Frontend | `next`, `react`, `tailwindcss`, `shadcn/ui`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns-tz`, `next-intl` |

---

# 11. Business Logic Rules

Implementation rules the code must enforce (the "how" behind section 5).

| ID | Rule |
|---|---|
| BL-1 | Slot lock: `updateMany({ where: { lawyerId, scheduleId, isBooked: false }, data: { isBooked: true } })`; `count === 0` -> `409 CONFLICT` |
| BL-2 | A booking transaction creates Consultation and Payment together; nothing partial is committed |
| BL-3 | No Stripe, Cloudinary, or SMTP call inside `$transaction` |
| BL-4 | If Stripe session creation fails: in a new transaction set consultation CANCELED (`canceledBy` SYSTEM-equivalent actor), free the slot, delete the UNPAID payment |
| BL-5 | Status transition map is the only way to change `status`; unknown or backward moves return 400 |
| BL-6 | Transition authority: lawyer only for own consultations; client may only SCHEDULED -> CANCELED on own; admin any valid |
| BL-7 | INPROGRESS requires `paymentStatus = PAID` and current time within the start window (BR-14) |
| BL-8 | On CANCELED: set `canceledAt`, `canceledBy`, `cancelReason`; set `LawyerSchedule.isBooked = false`; compute refund (BR-12); run refund outside the transaction; on refund failure keep CANCELED and mark payment for retry |
| BL-9 | Webhook: verify signature on the raw body; `create` a processed-event marker or set `stripeEventId` with unique constraint; on unique violation return 200; compare `amount_total` with Payment.amount before marking PAID |
| BL-10 | Cron `cancelUnpaid`: find consultations `status = SCHEDULED, paymentStatus = UNPAID, createdAt < now - UNPAID_CANCEL_MINUTES`; per row, in a transaction: cancel, free slot, delete payment; log count; safe to run twice |
| BL-11 | Review creation transaction: validate rules, insert review, recompute `averageRating` and `reviewCount` with an aggregate over `isHidden = false` |
| BL-12 | Review hide or unhide recomputes the aggregate in the same transaction and writes AuditLog |
| BL-13 | Public lawyer queries always include `isVerified: true, isDeleted: false, user: { status: 'ACTIVE' }` through one shared helper, not repeated by hand |
| BL-14 | Document and advice reads check `consultation.clientId` or `consultation.lawyerId` against the caller's profile id in the service layer, not only in the route |
| BL-15 | Role escalation guard: ignore any role in request body for register; `create-admin` only by SUPER_ADMIN; reject role SUPER_ADMIN everywhere |
| BL-16 | Block user: set status BLOCKED and delete all their sessions in one transaction |
| BL-17 | Create-lawyer transaction: create User, Lawyer, LawyerPracticeArea; send the invitation email after commit; if email fails, return success with a warning flag and allow "resend invitation" |
| BL-18 | Lawyer fee change does not alter existing Payments (amount is a snapshot) |
| BL-19 | Soft delete: set `isDeleted` and `deletedAt`; all reads filter `isDeleted: false` through shared helpers |
| BL-20 | Refund amount is never above `Payment.amount - refundedAmount` |
| BL-21 | Client overlap check: before locking, query the client's active consultations joined with Schedule for time overlap; repeat inside the transaction |
| BL-22 | Schedule generation: iterate days and 30-minute windows in UTC, `createMany({ skipDuplicates: true })` |
| BL-23 | Every AuditLog write for exceptional actions is part of the same transaction as the action |
| BL-24 | `validateRequest` must `return next(error)` on failure and never call `next()` afterwards |
| BL-25 | `notFound` middleware is registered before `globalErrorHandler` |

---

# 12. Response Format

## Success
```json
{
  "success": true,
  "message": "Consultation booked successfully",
  "data": { "id": "019...", "status": "SCHEDULED", "paymentStatus": "UNPAID" },
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```
`meta` appears on paginated lists only.

## Error
```json
{
  "success": false,
  "code": "SLOT_ALREADY_BOOKED",
  "message": "This slot has already been booked",
  "errorSources": [
    { "path": "scheduleId", "message": "Slot is no longer available" }
  ],
  "stack": null
}
```
`stack` only outside production. `code` values are stable and listed in `docs/API.md`.

## Status codes
`200` OK, `201` created, `204` no content, `400` validation or invalid transition, `401` unauthenticated or expired, `403` forbidden or blocked, `404` not found, `409` conflict (slot, duplicate), `413` file too large, `415` wrong file type, `422` business rule violation, `429` rate limited, `500` unexpected, `502` payment provider failure.

## Pagination query
`?page=1&limit=10&sortBy=averageRating&sortOrder=desc&searchTerm=property&practiceArea=Family&minFee=500&maxFee=1500&gender=FEMALE&language=Bangla&fields=name,consultationFee`

---

# 13. Deployment Checklist

**Before first deploy**
- [ ] All env variables set in the host; none committed; `.env.example` has placeholders only
- [ ] `BETTER_AUTH_SECRET`, JWT secrets are random and at least 32 characters
- [ ] Production DB created; `prisma migrate deploy` run; partial unique index and CHECK constraints present (`\d "Consultation"`)
- [ ] Super Admin seeded; password changed after first login
- [ ] CORS allows only the production frontend origin
- [ ] Cookies: `secure`, `httpOnly`, correct `sameSite` for the real domains; HTTPS only
- [ ] Stripe: live keys (or alternative BD gateway), webhook endpoint registered, signing secret set, test event received once
- [ ] Cloudinary folder (`legalease/images`, `legalease/pdfs`) and upload limits configured
- [ ] SMTP verified with a real send (OTP and invitation templates)
- [ ] Rate limiting active; helmet active; stack traces hidden
- [ ] Time zone: server in UTC; sample booking shows correct Asia/Dhaka time on the client
- [ ] Single cron instance (or advisory lock); cron logs visible
- [ ] Health check wired to the host's monitor
- [ ] Backups scheduled; one restore tested
- [ ] Error tracking and log shipping on
- [ ] Legal pages live: disclaimer, terms, privacy; lawyer reviewed Bar Council advertising rules

**Smoke tests after deploy**
- [ ] Register -> OTP -> login -> `/auth/me`
- [ ] Admin creates lawyer -> invitation -> password change -> admin verifies -> lawyer appears in list
- [ ] Lawyer picks slots -> client books (pay now) -> webhook -> PAID
- [ ] Two simultaneous bookings on one slot -> exactly one success
- [ ] Pay-later booking unpaid for 30 minutes -> cancelled and slot free
- [ ] Lawyer cancels paid consultation -> refund shown REFUNDED
- [ ] Client uploads PDF -> other client and admin get 403
- [ ] Review after COMPLETED -> rating updates; admin hides -> rating recalculated

**Rollback:** keep the previous build; migrations are additive; for a bad migration restore from backup, never edit applied migrations.

---

# 14. Future Considerations

| Phase | Item | Notes |
|---|---|---|
| P3 | Email reminders 24 h and 1 h before; reschedule (client, once, 24 h or more before) | Cron plus Nodemailer |
| P3 | Automatic no-show handling and refund | BR-15 |
| P4 | Real video consultation using `videoCallingId` | Jitsi, Agora, or Zoom SDK; keep no recording by default for privacy |
| P4 | In-app chat for follow-ups | WebSocket or SSE; retention rules |
| P5 | AI intake: describe the problem, get suggested practice area and lawyers | Claude API server-side; constrain output to existing practice-area ids; store text only with consent; disclaimer; never send case documents |
| Later | Local payment gateways (SSLCommerz, aamarPay, bKash, Nagad) | Implement `PaymentGateway`; keep idempotency |
| Later | Lawyer payouts and platform commission, invoices and receipts | Needs accounting review |
| Later | Packages and follow-up pricing, coupons | New Payment model fields |
| Later | Multi-lawyer firms (chambers) with shared calendars | New Organization model |
| Later | Document e-signature, secure document request from lawyer | Compliance review |
| Later | Mobile apps; push notifications; SMS reminders | Same API |
| Later | Search with trigram or Elasticsearch; availability index | When lawyer count grows |
| Later | Reviews: lawyer reply, verified-client badge, abuse reporting | Moderation workload |
| Later | Admin read-access to documents with mandatory reason and audit | Decide in Q5 |
| Ops | Read replicas, queue (BullMQ) for emails and refunds, multi-instance cron with locks | When traffic grows |

---

# Appendix A: Lessons applied from PH Healthcare

| PH gap | LegalEase requirement |
|---|---|
| Real-looking credentials in `.env.example` | Placeholders only; secret scan in CI (section 9, 13) |
| Create-doctor and create-specialty routes unprotected | Every non-public route has `checkAuth` (section 4.1, BL rules) |
| Double-booking race | BL-1 and partial unique index (D1, D2) |
| Status rules unenforced | BL-5, BL-6, section 3.2 |
| Admin can create Super Admin | BL-15, BR-19 |
| `validateRequest` calls `next()` after an error | BL-24 |
| Session lifetime about 60 days vs documented 1 day | AUTH-10 |
| Stripe call inside transaction | BL-3, D3 |
| `notFound` after error handler | BL-25 |
| `deleteAdmin` compares wrong ids | USR-3 |
| Empty files in repo | Lint check in CI |
| (New) Plain unique on slot blocks rebooking after cancel | Partial unique index (D2, section 4.12) |

# Appendix B: Open questions

| # | Question | Default used |
|---|---|---|
| Q1 | Client-cancel refund policy | BR-12: full if 24 h or more before, none under 24 h |
| Q2 | Variable slot length | Fixed 30 minutes |
| Q3 | Multiple consultations with same lawyer | Allowed on different, non-overlapping slots |
| Q4 | Pay-later hold time | 30 minutes (env configurable) |
| Q5 | Admin access to documents; retention and deletion period | No admin access; retention to be decided with a lawyer |
| Q6 | Languages field: free text or fixed list | Free text in v1, fixed list later |
| Q7 | Can clients edit reviews | No |
| Q8 | Lawyer commission and payouts | Out of scope v1 |
| Q9 | Which BD payment gateway for production | Undecided; interface ready |
