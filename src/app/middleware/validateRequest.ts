import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

/**
 * Validates request payload against a Zod schema.
 * Shapes input as { body, query, params, cookies }.
 * Enforces Architectural Rule 3: return next(error) on failure.
 */
export const validateRequest = (
  schema: ZodType<any, any, any>
) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) {
        Object.defineProperty(req, "query", {
          value: parsed.query,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (parsed.params !== undefined) req.params = parsed.params;

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export default validateRequest;
