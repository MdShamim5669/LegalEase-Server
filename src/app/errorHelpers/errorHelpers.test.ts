import { describe, it, expect } from "vitest";
import { z } from "zod";
import { AppError } from "./AppError";
import { handleZodError } from "./handleZodError";
import { handlePrismaClientError } from "./handlePrismaError";

describe("Error Helpers", () => {
  it("creates AppError with status code, message, and code", () => {
    const error = new AppError(404, "User not found", "USER_NOT_FOUND");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("User not found");
    expect(error.code).toBe("USER_NOT_FOUND");
  });

  it("handleZodError formats Zod issues into errorSources array", () => {
    const testSchema = z.object({
      email: z.string().email("Invalid email"),
    });
    const result = testSchema.safeParse({ email: "not-an-email" });
    if (!result.success) {
      const formatted = handleZodError(result.error);
      expect(formatted.statusCode).toBe(400);
      expect(formatted.code).toBe("VALIDATION_ERROR");
      expect(formatted.errorSources[0]?.path).toBe("email");
      expect(formatted.errorSources[0]?.message).toBe("Invalid email");
    }
  });

  it("handlePrismaClientError formats P2002 duplicate error into conflict", () => {
    const prismaErr = {
      code: "P2002",
      meta: { target: ["email"] },
    };
    const formatted = handlePrismaClientError(prismaErr);
    expect(formatted.statusCode).toBe(409);
    expect(formatted.code).toBe("DUPLICATE_RESOURCE");
    expect(formatted.errorSources[0]?.path).toBe("email");
  });
});
