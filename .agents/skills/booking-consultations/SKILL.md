---
name: booking-consultations
description: Implements and audits the LegalEase consultation booking lifecycle, atomic slot concurrency locking, Stripe checkout sessions, signed webhook processing, and unpaid auto-release cron jobs. Use when working on consultation bookings, payments, or scheduling flows.
---

# Booking Consultations & Payment Flow

Implement race-condition-free consultation booking, status progression, payment processing, and scheduled cleanup adhering to LegalEase PRD sections 3, 4.3, 4.4, and 11.

## When to Use This Skill
- Implementing or modifying `POST /api/v1/consultations/book` or `book-pay-later`.
- Handling Stripe Checkout sessions, success/cancel redirects, or webhook callbacks.
- Implementing the 25-minute unpaid booking release cron job.
- Managing consultation status changes (`SCHEDULED` -> `INPROGRESS` -> `COMPLETED` / `CANCELED`).
- Auditing or writing concurrency tests for double-booking prevention.

## Core Workflow & Validation Loop

```markdown
### Booking Implementation Checklist
- [ ] 1. Pre-validation: lawyer exists, isVerified=true, isDeleted=false, user.status=ACTIVE.
- [ ] 2. Slot validation: schedule is in the future (>30 min ahead), lawyer owns slot, client has no overlapping active consultation.
- [ ] 3. Atomic Slot Lock: tx.lawyerSchedule.updateMany where isBooked: false; throw 409 if count === 0.
- [ ] 4. Transactional Record Creation: insert Consultation + Payment (UNPAID) in the same database transaction.
- [ ] 5. External Payment Call (OUTSIDE transaction): generate Stripe Checkout session in integer BDT.
- [ ] 6. Compensation Handler: if Stripe fails, run compensating transaction to cancel consultation, free slot, and delete unpaid payment.
- [ ] 7. Webhook Handler: raw body, verify signature, enforce unique stripeEventId, update payment & consultation to PAID.
- [ ] 8. Scheduled Cleanup: node-cron job every 25 min to auto-cancel bookings unpaid for 30+ minutes.
```

## Atomic Booking Implementation Pattern

```ts
// src/app/module/consultation/consultation.service.ts
const bookConsultation = async (clientId: string, payload: IBookPayload) => {
  const { lawyerId, scheduleId, type, topic } = payload;

  // 1. Verify Lawyer & Slot validity
  const lawyer = await prisma.lawyer.findFirst({
    where: { id: lawyerId, isVerified: true, isDeleted: false, user: { status: "ACTIVE" } },
  });
  if (!lawyer) throw new AppError(status.NOT_FOUND, "Lawyer unavailable", "LAWYER_NOT_FOUND");

  // 2. Atomic Database Transaction (DB WORK ONLY)
  const consultation = await prisma.$transaction(async (tx) => {
    // Atomic Slot Lock
    const locked = await tx.lawyerSchedule.updateMany({
      where: { lawyerId, scheduleId, isBooked: false },
      data: { isBooked: true },
    });
    if (locked.count === 0) {
      throw new AppError(status.CONFLICT, "Slot already booked by another user", "SLOT_ALREADY_BOOKED");
    }

    // Create Consultation + Payment
    return tx.consultation.create({
      data: {
        clientId,
        lawyerId,
        scheduleId,
        type,
        topic,
        videoCallingId: uuidv7(),
        status: "SCHEDULED",
        paymentStatus: "UNPAID",
        payment: {
          create: {
            amount: lawyer.consultationFee, // Snapshot of lawyer fee
            transactionId: uuidv7(),
            status: "UNPAID",
          },
        },
      },
      include: { payment: true },
    });
  });

  // 3. Network Calls OUTSIDE DB Transaction
  try {
    const session = await stripeGateway.createCheckoutSession({
      consultationId: consultation.id,
      amount: consultation.payment!.amount,
    });
    return { consultation, paymentUrl: session.url };
  } catch (error) {
    // Run compensation
    await compensateFailedBooking(consultation.id, lawyerId, scheduleId);
    throw new AppError(status.BAD_GATEWAY, "Payment provider unavailable", "PAYMENT_GATEWAY_ERROR");
  }
};
```

## Status Transitions & Refund Rules

Refer to the complete state transition matrix and refund formulas in:  
👉 **[`resources/state-machine.md`](resources/state-machine.md)**

## Hard Rules & Verification
- **Never** use `findFirst` followed by `update` to lock slots (causes race conditions).
- **Never** place Stripe, Cloudinary, or SMTP calls inside `prisma.$transaction`.
- Verify the DB backstop exists: partial unique index `(lawyerId, scheduleId) WHERE status <> 'CANCELED'`.
- Verify webhook idempotency: duplicate `stripeEventId` must return HTTP 200 without duplicate processing.
