import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from "express";

// Lab 4 #69 (CL-07): Express 4 does not catch a rejected promise from an async handler, so one thrown
// Prisma error used to leave the request hanging and exit the whole API process. Importing this module
// before any router is created makes every Router handler forward a rejection to next(err), where
// errorHandler answers with the safe 500 of the API conventions.
type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

function forwardRejections(fn: unknown): unknown {
  if (Array.isArray(fn)) return fn.map(forwardRejections);
  // Error handlers (4 arguments) and mounted routers keep their own signature.
  if (typeof fn !== "function" || fn.length === 4 || "stack" in fn) return fn;
  const handler = fn as Handler;
  return function asyncSafe(this: unknown, req: Request, res: Response, next: NextFunction) {
    const result = handler.call(this, req, res, next);
    if (result instanceof Promise) result.catch(next);
    return result;
  };
}

const PATCHED = Symbol.for("toktickit.asyncRoutes");
const routerProto = express.Router as unknown as Record<string | symbol, unknown>;
if (!routerProto[PATCHED]) {
  for (const method of ["use", "all", "get", "post", "put", "patch", "delete"]) {
    const original = routerProto[method] as (...args: unknown[]) => unknown;
    routerProto[method] = function (this: unknown, ...args: unknown[]) {
      return original.apply(this, args.map(forwardRejections));
    };
  }
  routerProto[PATCHED] = true;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // Client errors raised by Express itself (e.g. malformed JSON, 400) keep their default response.
  if (res.headersSent || (typeof err?.status === "number" && err.status < 500)) return next(err);
  console.error("Unhandled route error:", err);
  res.status(500).json({ error: "Something went wrong.", code: "INTERNAL" });
};
