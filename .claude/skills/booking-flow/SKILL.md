---
name: booking-flow
description: Implement or audit the consultation booking flow (atomic slot lock, payment creation, Stripe checkout, webhook, cron). Use for CON-1..CON-10 work or when reviewing double-booking risk.
---

# booking-flow

Read `.claude/rules/booking-and-payments.md` first.

## Implementation order
1. Validate: lawyer verified and not deleted; slot exists, is in the future, belongs to the lawyer.
2. Transaction (DB only):
   ```ts
   const consultation = await prisma.$transaction(async (tx) => {
     const locked = await tx.lawyerSchedule.updateMany({
       where: { lawyerId, scheduleId, isBooked: false },
       data: { isBooked: true },
     });
     if (locked.count === 0) throw new AppError(status.CONFLICT, "Slot already booked");
     return tx.consultation.create({
       data: {
         clientId, lawyerId, scheduleId, type, topic,
         videoCallingId: uuidv7(),
         payment: { create: { amount: lawyer.consultationFee, transactionId: uuidv7() } },
       },
       include: { payment: true },
     });
   });
   ```
3. Outside the transaction: create the Stripe Checkout session (BDT). On failure, compensate (cancel, free slot, delete payment).
4. Webhook `checkout.session.completed`: verify signature, check `stripeEventId` unseen, mark consultation and payment PAID.
5. Cron (25 min): cancel unpaid 30+ min, free slot.

## Audit checklist
- Any `findFirst` then `update` on slots? Replace it.
- Any Stripe call inside `$transaction`? Move it out.
- Partial unique index `(lawyerId, scheduleId) WHERE status <> 'CANCELED'` present (not a plain unique)? Can a cancelled slot be booked again?
- Webhook idempotent? Cron safe to run twice?
- Concurrency test exists?
