import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";
import { stripeGateway } from "../../gateway/StripeGateway";
import { sslCommerzGateway } from "../../gateway/SSLCommerzGateway";
import { getPaymentGateway } from "../../gateway/gateway.factory";
import { sendEmail } from "../../utils/email";
import { QueryBuilder } from "../../utils/QueryBuilder";
import env from "../../config/env";

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

export const handleSSLCommerzSuccess = async (payload: Record<string, any>) => {
  const event = await sslCommerzGateway.verifyWebhookSignature(payload);

  const consultationId = event.consultationId || payload.value_a;
  if (!consultationId) {
    throw new AppError(status.BAD_REQUEST, "Missing consultation ID in SSLCommerz payload", "MISSING_METADATA");
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { stripeEventId: event.eventId },
  });
  if (existingPayment) {
    return {
      success: true,
      alreadyProcessed: true,
      consultationId,
      redirectUrl: `${env.FRONTEND_URL}/consultations/${consultationId}/success`,
    };
  }

  const { consultation, payment } = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { consultationId },
      data: {
        status: "PAID",
        stripeEventId: event.eventId,
        paidAt: new Date(),
        paymentGatewayData: payload,
      },
    });

    const c = await tx.consultation.update({
      where: { id: consultationId },
      data: { paymentStatus: "PAID" },
      include: { client: true, lawyer: true },
    });

    return { consultation: c, payment: p };
  });

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

  return {
    success: true,
    consultationId,
    transactionId: event.paymentIntentId,
    redirectUrl: `${env.FRONTEND_URL}/consultations/${consultationId}/success`,
  };
};

export const handleSSLCommerzFail = async (payload: Record<string, any>) => {
  const consultationId = payload.value_a;
  return {
    success: false,
    consultationId,
    reason: payload.error || "Payment verification failed or was declined by bank",
    redirectUrl: consultationId
      ? `${env.FRONTEND_URL}/consultations/${consultationId}/failed`
      : `${env.FRONTEND_URL}/consultations`,
  };
};

export const handleSSLCommerzCancel = async (payload: Record<string, any>) => {
  const consultationId = payload.value_a;
  return {
    success: false,
    consultationId,
    reason: "Transaction cancelled by user",
    redirectUrl: consultationId
      ? `${env.FRONTEND_URL}/consultations/${consultationId}/canceled`
      : `${env.FRONTEND_URL}/consultations`,
  };
};

export const handleSSLCommerzIpn = async (payload: Record<string, any>) => {
  return await handleSSLCommerzSuccess(payload);
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

  const gatewayData = (payment.paymentGatewayData as Record<string, any>) || {};
  const isSSLCommerz =
    gatewayData.provider === "SSLCOMMERZ" ||
    (payment.stripeEventId && payment.stripeEventId.startsWith("ssl_"));

  const activeGateway = isSSLCommerz
    ? sslCommerzGateway
    : getPaymentGateway(gatewayData.provider || "STRIPE");

  // 1. Outside transaction: invoke payment gateway refund API
  const refundRes = await activeGateway.refund({
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
  const queryBuilder = new QueryBuilder(prisma.payment, query);
  return await queryBuilder
    .filter()
    .sort({ field: "createdAt", order: "desc" })
    .paginate()
    .include({
      consultation: {
        select: {
          id: true,
          status: true,
          topic: true,
          client: { select: { id: true, name: true, email: true } },
          lawyer: { select: { id: true, name: true, email: true } },
        },
      },
    })
    .execute();
};

export const PaymentService = {
  handleWebhook,
  handleSSLCommerzSuccess,
  handleSSLCommerzFail,
  handleSSLCommerzCancel,
  handleSSLCommerzIpn,
  refundPayment,
  getAllPayments,
};

export default PaymentService;
