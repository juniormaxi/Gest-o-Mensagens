import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
export class AppError extends Error { constructor(public status: number, message: string, public details?: unknown) { super(message); } }
export const notFound: RequestHandler = (_req, _res, next) => next(new AppError(404, 'Rota não encontrada'));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) { res.status(400).json({ error: 'Dados inválidos', details: error.issues }); return; }
  if (error instanceof AppError) { res.status(error.status).json({ error: error.message, details: error.details }); return; }
  console.error(error instanceof Error ? error.message : 'Erro desconhecido');
  res.status(500).json({ error: 'Erro interno do servidor' });
};
