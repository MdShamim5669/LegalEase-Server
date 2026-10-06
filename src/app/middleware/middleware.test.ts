import { describe, it, expect, vi } from "vitest";
import { notFound } from "./notFound";
import { Request, Response } from "express";
import { AppError } from "../errorHelpers/AppError";

describe("notFound middleware", () => {
  it("calls next with AppError 404 NOT_FOUND", () => {
    const req = { originalUrl: "/api/v1/unknown" } as Request;
    const res = {} as Response;
    const next = vi.fn();

    notFound(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });
});
