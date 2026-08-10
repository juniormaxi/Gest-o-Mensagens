import { prisma } from '../lib/prisma.js';
export const audit = (data: { userId?: string; action: string; entity?: string; entityId?: string; ip?: string; metadata?: object }) =>
  prisma.auditLog.create({ data: { ...data, metadata: data.metadata ?? {} } });
