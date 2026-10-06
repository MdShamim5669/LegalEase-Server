import cron from "node-cron";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

/**
 * Core business logic for canceling unpaid bookings past the threshold.
 * Exported separately to allow direct testing without triggering cron intervals.
 * Enforces PRD Rule BL-10.
 */
export const cancelUnpaidConsultations = async (thresholdMinutes = 30): Promise<number> => {
  const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const expiredConsultations = await prisma.consultation.findMany({
    where: {
      status: "SCHEDULED",
      paymentStatus: "UNPAID",
      createdAt: { lt: cutoffTime },
    },
    select: {
      id: true,
      lawyerId: true,
      scheduleId: true,
    },
  });

  if (expiredConsultations.length === 0) {
    return 0;
  }

  let canceledCount = 0;

  for (const item of expiredConsultations) {
    await prisma.$transaction(async (tx) => {
      // 1. Mark consultation CANCELED
      await tx.consultation.update({
        where: { id: item.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          cancelReason: `Unpaid booking expired (${thresholdMinutes} minute timeout)`,
        },
      });

      // 2. Free the lawyer schedule slot atomically
      await tx.lawyerSchedule.updateMany({
        where: {
          lawyerId: item.lawyerId,
          scheduleId: item.scheduleId,
        },
        data: { isBooked: false },
      });

      // 3. Delete unpaid payment record
      await tx.payment.deleteMany({
        where: {
          consultationId: item.id,
          status: "UNPAID",
        },
      });
    });

    canceledCount++;
  }

  return canceledCount;
};

/**
 * Initializes the node-cron scheduled job running every 25 minutes.
 */
export const initCancelUnpaidJob = () => {
  // Cron schedule: every 25 minutes (*/25 * * * *)
  const task = cron.schedule("*/25 * * * *", async () => {
    logger.info("[Cron] Running cancelUnpaid consultations job...");
    try {
      const count = await cancelUnpaidConsultations(30);
      logger.info(`[Cron] Successfully processed ${count} expired unpaid consultations.`);
    } catch (error) {
      logger.error({ err: error }, "[Cron] Error occurred while canceling unpaid consultations.");
    }
  });

  return task;
};

export default initCancelUnpaidJob;
