import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http.js';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Rota não encontrada: ${req.method} ${req.path}`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(422).json({ message: 'Dados inválidos.', errors: err.flatten() });
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, details: err.details });
  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}
