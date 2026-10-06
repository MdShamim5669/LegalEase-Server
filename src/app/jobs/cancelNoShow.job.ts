import cron from "node-cron";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

/**
 * Cancels PAID consultations where lawyer did not start within 30 minutes after slot end.
 * Enforces PRD Rule BR-15.
 */
export const cancelNoShowConsultations = async (thresholdMinutes = 30): Promise<number> => {
  const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  // Find SCHEDULED, PAID consultations where slot end time passed cutoff
  const noShowConsultations = await prisma.consultation.findMany({
    where: {
      status: "SCHEDULED",
      paymentStatus: "PAID",
      lawyerSchedule: {
        schedule: {
          endDateTime: { lt: cutoffTime },
        },
      },
    },
    select: {
      id: true,
      lawyerId: true,
      scheduleId: true,
      payment: {
        select: {
          id: true,
          amount: true,
        },
      },
    },
  });

  if (noShowConsultations.length === 0) {
    return 0;
  }

  let canceledCount = 0;

  for (const item of noShowConsultations) {
    await prisma.$transaction(async (tx) => {
      // 1. Mark CANCELED
      await tx.consultation.update({
        where: { id: item.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          cancelReason: `Lawyer no-show after slot end (${thresholdMinutes} minute threshold)`,
        },
      });

      // 2. Free the slot
      await tx.lawyerSchedule.updateMany({
        where: {
          lawyerId: item.lawyerId,
          scheduleId: item.scheduleId,
        },
        data: { isBooked: false },
      });

      // 3. Mark payment for refund
      if (item.payment) {
        await tx.payment.update({
          where: { id: item.payment.id },
          data: {
            status: "REFUNDED",
            refundedAmount: item.payment.amount,
            refundedAt: new Date(),
          },
        });
      }
    });

    canceledCount++;
  }

  return canceledCount;
};

/**
 * Initializes the no-show cancel job running every 15 minutes.
 */
export const initCancelNoShowJob = () => {
  const task = cron.schedule("*/15 * * * *", async () => {
    logger.info("[Cron] Running cancelNoShow consultations job...");
    try {
      const count = await cancelNoShowConsultations(30);
      logger.info(`[Cron] Processed ${count} no-show consultations.`);
    } catch (error) {
      logger.error({ err: error }, "[Cron] Error occurred during no-show cancellation.");
    }
  });

  return task;
};

export default initCancelNoShowJob;
