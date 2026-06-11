import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';

export type AuthUser = { id: string; email: string; role: 'user' | 'admin'; nome: string };

declare global { namespace Express { interface Request { user?: AuthUser } } }

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Autenticação obrigatória.');
  try {
    req.user = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
    next();
  } catch {
    throw new HttpError(401, 'Token inválido ou expirado.');
  }
}

export function admin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Acesso restrito ao administrador.');
  next();
}
