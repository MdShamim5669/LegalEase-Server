---
description: Rules for consultation booking, status, payment, cron
globs: ["src/app/module/consultation/**", "src/app/module/payment/**", "src/app/module/lawyerSchedule/**"]
---

# Booking and payment rules

## Atomic booking
```ts
const locked = await tx.lawyerSchedule.updateMany({
  where: { lawyerId, scheduleId, isBooked: false },
  data: { isBooked: true },
});
if (locked.count === 0) throw new AppError(status.CONFLICT, "Slot already booked");
```
- Never `findFirst` then `update` for slot locking.
- DB backstop: PARTIAL unique index `(lawyerId, scheduleId) WHERE status <> 'CANCELED'` on Consultation (raw SQL migration). Never a plain `@@unique`: it would block re-booking a slot after a cancellation.
- Reject if lawyer is unverified/deleted or the slot start is in the past.

## Transactions
- `prisma.$transaction` contains DB work only.
- Stripe/Cloudinary/email calls go before or after, never inside.
- If Stripe fails after the transaction, compensate: cancel the consultation, free the slot, delete the unpaid payment.

## Status transitions
```ts
const allowed = {
  SCHEDULED: ["INPROGRESS", "CANCELED"],
  INPROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELED: [],
};
```
- Lawyer: forward moves and cancel on own consultation.
- Client: cancel own consultation only while SCHEDULED.
- Admin: any valid transition.
- COMPLETED and CANCELED are final.

## Payments
- Amount = lawyer `consultationFee` (integer BDT), copied onto the Payment at booking time.
- Webhook handler is idempotent: unique `stripeEventId`.
- Paid cancel by lawyer -> refund, payment `REFUNDED`, slot freed.
- Keep the gateway behind a `PaymentGateway` interface.

## Cron (every 25 minutes)
Cancel consultations unpaid for 30+ minutes, delete their UNPAID payment, free the slot, all in one transaction. Cron must be safe to run twice (idempotent) and must log counts.
