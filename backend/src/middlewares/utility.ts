import _ from "lodash";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { handleMonkeyResponse, MonkeyResponse } from "../utils/monkey-response";
import { isDevEnvironment } from "../utils/misc";
import { recordClientVersion as prometheusRecordClientVersion } from "../utils/prometheus";

export const emptyMiddleware = (
  _req: MonkeyTypes.Request,
  _res: Response,
  next: NextFunction
): void => next();

type AsyncHandler = (
  req: MonkeyTypes.Request,
  res?: Response
) => Promise<MonkeyResponse>;

/**
 * This utility serves as an alternative to wrapping express handlers with try/catch statements.
 * Any routes that use an async handler function should wrap the handler with this function.
 * Without this, any errors thrown will not be caught by the error handling middleware, and
 * the app will hang!
 */
export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return async (
    req: MonkeyTypes.Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const handlerData = await handler(req, res);
      handleMonkeyResponse(handlerData, res);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Uses the middlewares only in production. Otherwise, uses an empty middleware.
 */
export function useInProduction(
  middlewares: RequestHandler[]
): RequestHandler[] {
  return middlewares.map((middleware) =>
    isDevEnvironment() ? emptyMiddleware : middleware
  );
}

/**
 * record the client version from the `x-client-version`  or ` client-version` header to prometheus
 */
export function recordClientVersion(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const clientVersion =
      (req.headers["x-client-version"] as string) ||
      req.headers["client-version"];

    prometheusRecordClientVersion(clientVersion?.toString() ?? "unknown");

    next();
  };
}
