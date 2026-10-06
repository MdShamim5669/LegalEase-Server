# Detailed Error Handling Patterns & Worked Examples

This reference provides implementation patterns for LegalEase's error handlers, Zod error parsing, Prisma error mapping, and compensation logic.

## 1. Zod Error Mapper (`handleZodError.ts`)

```ts
import { ZodError } from "zod";
import status from "http-status";

export interface IGenericErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  errorSources: Array<{ path: string; message: string }>;
}

export const handleZodError = (error: ZodError): IGenericErrorResponse => {
  const errorSources = error.issues.map((issue) => {
    return {
      path: issue.path[issue.path.length - 1]?.toString() || "unknown",
      message: issue.message,
    };
  });

  return {
    statusCode: status.BAD_REQUEST,
    code: "VALIDATION_ERROR",
    message: "Validation Error",
    errorSources,
  };
};
```

## 2. Prisma Error Mapper (`handlePrismaError.ts`)

```ts
import { Prisma } from "@prisma/client";
import status from "http-status";
import { IGenericErrorResponse } from "./handleZodError";

export const handlePrismaClientError = (
  error: Prisma.PrismaClientKnownRequestError
): IGenericErrorResponse => {
  let statusCode = status.BAD_REQUEST;
  let message = "Database Error";
  let code = "DATABASE_ERROR";
  let errorSources = [{ path: "", message: error.message }];

  if (error.code === "P2002") {
    statusCode = status.CONFLICT;
    code = "DUPLICATE_RESOURCE";
    const target = (error.meta?.target as string[])?.join(", ") || "field";
    message = `Duplicate entry for ${target}`;
    errorSources = [{ path: target, message: `A record with this ${target} already exists.` }];
  } else if (error.code === "P2025") {
    statusCode = status.NOT_FOUND;
    code = "RESOURCE_NOT_FOUND";
    message = (error.meta?.cause as string) || "Record to update or delete does not exist.";
  }

  return {
    statusCode,
    code,
    message,
    errorSources,
  };
};
```

## 3. Global Error Handler (`globalErrorHandler.ts`)

```ts
import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import config from "../config/env";
import { AppError } from "../errorHelpers/AppError";
import { handleZodError } from "../errorHelpers/handleZodError";
import { handlePrismaClientError } from "../errorHelpers/handlePrismaError";

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let code = "INTERNAL_SERVER_ERROR";
  let errorSources: Array<{ path: string; message: string }> = [];

  if (err instanceof ZodError) {
    const simplified = handleZodError(err);
    statusCode = simplified.statusCode;
    code = simplified.code;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplified = handlePrismaClientError(err);
    statusCode = simplified.statusCode;
    code = simplified.code;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    errorSources = err.errorSources || [{ path: "", message: err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [{ path: "", message: err.message }];
  }

  return res.status(statusCode).json({
    success: false,
    code,
    message,
    errorSources,
    stack: config.NODE_ENV === "development" ? err.stack : null,
  });
};
```

## 4. Compensation Pattern (Failure Outside DB Transaction)

When an external network call (such as Stripe Checkout session creation) fails after a DB transaction has committed:

```ts
try {
  const stripeSession = await stripeGateway.createCheckoutSession({
    consultationId: consultation.id,
    amount: consultation.payment.amount,
  });
  return { consultation, paymentUrl: stripeSession.url };
} catch (externalError) {
  // Compensation transaction: rollback DB state cleanly
  await prisma.$transaction(async (tx) => {
    await tx.consultation.update({
      where: { id: consultation.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancelReason: "Payment session creation failed",
      },
    });
    await tx.lawyerSchedule.updateMany({
      where: { lawyerId: consultation.lawyerId, scheduleId: consultation.scheduleId },
      data: { isBooked: false },
    });
    await tx.payment.deleteMany({
      where: { consultationId: consultation.id, status: "UNPAID" },
    });
  });

  throw new AppError(
    status.BAD_GATEWAY,
    "Payment gateway error. Slot released, please try again.",
    "PAYMENT_GATEWAY_ERROR"
  );
}
```
