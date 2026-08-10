import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import { AppError } from '../lib/errors.js';
type TokenPayload = { sub: string; role: 'ADMIN' | 'OPERATOR'; name: string; email: string };
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Autenticação necessária'));
  try { const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload; req.user = { id: payload.sub, role: payload.role, name: payload.name, email: payload.email }; next(); }
  catch { next(new AppError(401, 'Sessão inválida ou expirada')); }
};
export const requireRole = (...roles: Array<'ADMIN' | 'OPERATOR'>): RequestHandler => (req, _res, next) => req.user && roles.includes(req.user.role) ? next() : next(new AppError(403, 'Acesso negado'));
