import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";
import { stripeGateway } from "../../gateway/StripeGateway";
import { sendEmail } from "../../utils/email";

export const handleWebhook = async (payload: string | Buffer, signature: string) => {
  const event = await stripeGateway.verifyWebhookSignature(payload, signature);

  // Idempotency check on stripeEventId (Rule 41 in booking-and-payments.md)
  const existingPayment = await prisma.payment.findFirst({
    where: { stripeEventId: event.eventId },
  });
  if (existingPayment) {
    return { received: true, alreadyProcessed: true };
  }

  if (event.eventType === "checkout.session.completed") {
    const consultationId = event.consultationId;
    if (!consultationId) {
      throw new AppError(status.BAD_REQUEST, "Missing consultation ID in webhook payload", "MISSING_METADATA");
    }

    const { consultation, payment } = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { consultationId },
        data: {
          status: "PAID",
          stripeEventId: event.eventId,
          paidAt: new Date(),
        },
      });

      const c = await tx.consultation.update({
        where: { id: consultationId },
        data: { paymentStatus: "PAID" },
        include: { client: true, lawyer: true },
      });

      return { consultation: c, payment: p };
    });

    // Outside transaction email dispatch (Rule BL-3)
    try {
      await sendEmail({
        to: consultation.client.email,
        subject: "Consultation Appointment Confirmed",
        template: "bookingConfirmed",
        data: {
          clientName: consultation.client.name,
          lawyerName: consultation.lawyer.name,
          consultationId: consultation.id,
          appointmentDate: new Date().toLocaleDateString(),
          appointmentTime: "Scheduled Session (BST)",
          amount: `${payment.amount} BDT`,
          meetingLink: `https://meet.legalease.com/rooms/${consultation.videoCallingId}`,
        },
      });
    } catch (_err) {
      // Non-blocking email error
    }

    return { received: true };
  }

  return { received: true };
};

export const refundPayment = async (
  _adminUser: IAuthUser,
  paymentId: string,
  reason?: string
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { consultation: true },
  });

  if (!payment) {
    throw new AppError(status.NOT_FOUND, "Payment record not found", "PAYMENT_NOT_FOUND");
  }

  if (payment.status !== "PAID") {
    throw new AppError(status.BAD_REQUEST, "Only verified PAID transactions can be refunded", "INVALID_REFUND_STATE");
  }

  // 1. Outside transaction: invoke payment gateway refund API
  const refundRes = await stripeGateway.refund({
    transactionId: payment.transactionId,
    amount: payment.amount,
    reason: reason || "requested_by_customer",
  });

  // 2. Database state update
  return await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        refundId: refundRes.refundId,
        refundedAmount: payment.amount,
        refundedAt: new Date(),
      },
    });

    await tx.consultation.update({
      where: { id: payment.consultationId },
      data: {
        paymentStatus: "REFUNDED",
        status: "CANCELED",
        canceledAt: new Date(),
        cancelReason: `Refunded: ${reason || "Administrative refund"}`,
      },
    });

    await tx.lawyerSchedule.updateMany({
      where: {
        lawyerId: payment.consultation.lawyerId,
        scheduleId: payment.consultation.scheduleId,
      },
      data: { isBooked: false },
    });

    return updatedPayment;
  });
};

export const getAllPayments = async (query: { page?: number | string; limit?: number | string }) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count(),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const PaymentService = {
  handleWebhook,
  refundPayment,
  getAllPayments,
};

export default PaymentService;
