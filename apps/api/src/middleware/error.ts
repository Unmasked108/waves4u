import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    // `fields` lets forms show the message next to the right input.
    const fields: Record<string, string> = {};
    for (const i of err.issues) fields[i.path.join('.') || '_'] ??= i.message;
    return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input', fields, issues: err.issues });
  }
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  if (err?.code === 11000) return res.status(409).json({ error: 'Already exists' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
};
