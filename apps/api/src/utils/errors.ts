import type { Request, Response, NextFunction, RequestHandler } from 'express';

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Lets async route handlers throw errors into the error middleware. */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
