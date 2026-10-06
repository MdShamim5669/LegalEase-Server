---
name: handling-errors
description: Manages application and API error handling patterns including AppError classes, Zod validation errors, Prisma database error mapping, HTTP envelopes, and graceful degradation. Use when writing error handling logic, designing controllers/services, or debugging API failures.
---

# Error Handling Patterns

Build resilient LegalEase backend services with standardized error handling that guarantees consistent API response envelopes, protects internal secrets, and provides clear debugging information.

## When to Use This Skill
- Implementing controllers, services, or middleware in Express 5.
- Handling Zod request validation failures.
- Handling Prisma errors (e.g. `P2002` unique constraint, `P2025` record not found).
- Handling third-party external failures (Stripe, Cloudinary, SMTP).
- Debugging unexpected runtime errors and HTTP status code mapping.

## Standard LegalEase Error Envelope (PRD Section 12)

Every error response emitted by the API must conform to this schema:

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
*Note: `stack` is strictly `null` in production environments (`NODE_ENV === 'production'`).*

## Core Workflow & Validation Loop

1. **Plan Error Flow**:
   - Determine whether the error is **operational/expected** (validation, resource not found, conflict) or **programmer/unhandled** (unhandled exception, null pointer).
   - Expected errors throw an instance of `AppError(statusCode, message, code, errorSources)`.
2. **Handle via Central Middleware**:
   - Wrap all Express controller handlers with `catchAsync`.
   - Never send error responses manually from services or controllers.
   - Let `globalErrorHandler` inspect error types and format the response envelope.
3. **Execute & Test**:
   - Run tests to verify the exact status code and error code response.

## Instructions & Code Templates

### 1. Custom `AppError`
```ts
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public errorSources?: Array<{ path: string; message: string }>;

  constructor(
    statusCode: number,
    message: string,
    code: string = "APPLICATION_ERROR",
    errorSources?: Array<{ path: string; message: string }>,
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errorSources = errorSources;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

### 2. Controller & Service Exception Flow
- In services, throw `AppError` using `http-status` constants:
  ```ts
  if (!lawyer || lawyer.isDeleted || !lawyer.isVerified) {
    throw new AppError(status.NOT_FOUND, "Lawyer not found or unavailable", "LAWYER_NOT_FOUND");
  }
  ```
- In controllers, wrap with `catchAsync`:
  ```ts
  export const getLawyerById = catchAsync(async (req: Request, res: Response) => {
    const result = await LawyerService.getById(req.params.id);
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Lawyer retrieved successfully",
      data: result,
    });
  });
  ```

### 3. Central Global Error Handler Mapping
The central `globalErrorHandler.ts` handles:
- **ZodError**: Maps issues into `errorSources: [{ path, message }]` with status `400 BAD_REQUEST` and code `VALIDATION_ERROR`.
- **Prisma P2002 (Unique constraint)**: Maps to `409 CONFLICT` and code `DUPLICATE_RESOURCE`.
- **Prisma P2025 (Record not found)**: Maps to `404 NOT_FOUND` and code `RESOURCE_NOT_FOUND`.
- **JsonWebTokenError / TokenExpiredError**: Maps to `401 UNAUTHORIZED` and code `TOKEN_EXPIRED` or `INVALID_TOKEN`.

## Detailed Worked Examples
For complete implementations of Zod error mappers, Prisma error handlers, and compensating transaction rollbacks, consult:  
👉 **[`resources/details.md`](resources/details.md)**
