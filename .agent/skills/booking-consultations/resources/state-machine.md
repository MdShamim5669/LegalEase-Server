# Consultation State Transitions & Refund Policies

## 1. Allowed Status Transitions (PRD Section 3.2 & Rule BL-5)

```ts
export const ALLOWED_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  SCHEDULED: ["INPROGRESS", "CANCELED"],
  INPROGRESS: ["COMPLETED"],
  COMPLETED: [], // Final state
  CANCELED: [],  // Final state
};
```

## 2. Actor Authority Matrix (Rule BL-6)

| Current Status | Next Status | Allowed Actors | Conditions / Business Rules |
| :--- | :--- | :--- | :--- |
| `SCHEDULED` | `INPROGRESS` | Lawyer (own), Admin | Must be `PAID`. Must be within the start window (from 10 min before slot start until slot end). |
| `SCHEDULED` | `CANCELED` | Client (own) | If paid, applies refund policy BR-12. Slot is freed. |
| `SCHEDULED` | `CANCELED` | Lawyer (own) | If paid, full 100% refund is initiated. Slot is freed. |
| `SCHEDULED` | `CANCELED` | Admin | Any valid administrative reason. Slot is freed. |
| `SCHEDULED` | `CANCELED` | Cron (System) | Automatic timeout for bookings unpaid after 30 minutes. Unpaid payment deleted, slot freed. |
| `INPROGRESS` | `COMPLETED` | Lawyer (own), Admin | Consultation finished. Enables advice note creation and client review. |

## 3. Refund Calculation (Rule BR-12 & BL-20)

When a consultation is cancelled while `paymentStatus === 'PAID'`:

```ts
export function calculateRefundAmount(
  consultation: { scheduledStart: Date; payment: { amount: number; refundedAmount: number } },
  canceledBy: "CLIENT" | "LAWYER" | "ADMIN"
): number {
  const remainingPaid = consultation.payment.amount - consultation.payment.refundedAmount;
  if (remainingPaid <= 0) return 0;

  // Lawyer or Admin cancellation = 100% refund
  if (canceledBy === "LAWYER" || canceledBy === "ADMIN") {
    return remainingPaid;
  }

  // Client cancellation: Check 24-hour lead time
  const hoursUntilStart = (consultation.scheduledStart.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilStart >= 24) {
    return remainingPaid; // 100% refund
  }

  // Under 24 hours: 0% refund
  return 0;
}
```

## 4. Unpaid Booking Auto-Cancellation Cron (Rule BL-10)

Runs every 25 minutes (`*/25 * * * *`).

```ts
// src/app/jobs/cancelUnpaid.job.ts
import cron from "node-cron";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

export const initCancelUnpaidJob = () => {
  cron.schedule("*/25 * * * *", async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const expired = await prisma.consultation.findMany({
      where: {
        status: "SCHEDULED",
        paymentStatus: "UNPAID",
        createdAt: { lt: thirtyMinutesAgo },
      },
    });

    let count = 0;
    for (const item of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.consultation.update({
          where: { id: item.id },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
            cancelReason: "Unpaid booking expired (30 minute timeout)",
          },
        });
        await tx.lawyerSchedule.updateMany({
          where: { lawyerId: item.lawyerId, scheduleId: item.scheduleId },
          data: { isBooked: false },
        });
        await tx.payment.deleteMany({
          where: { consultationId: item.id, status: "UNPAID" },
        });
      });
      count++;
    }

    logger.info(`[Cron] Auto-canceled ${count} unpaid consultations.`);
  });
};
```
