import { z } from 'zod';

const MSG = 'Enter a valid 10-digit Indian mobile number';

/** Accepts "98765 43210", "+91-98765-43210", "09876543210" ... and returns the 10 digits. */
export const indianMobile = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s\-().]/g, ''))
  .refine((s) => /^(\+?91|0)?[6-9]\d{9}$/.test(s), MSG)
  .transform((s) => s.slice(-10));
