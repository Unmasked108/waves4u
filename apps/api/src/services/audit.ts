import { AuditLog } from '../models/index.js';

export const audit = (actor: string, action: string, target?: string, meta?: unknown) =>
  AuditLog.create({ actor, action, target, meta });
