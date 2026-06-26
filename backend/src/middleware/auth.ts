import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { HttpError } from '../utils/http.js';

export type AuthUser = {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'funcionario' | 'inactive' | string;
  nome?: string;
  funcionario_permissoes?: string[];
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const JWT_SECRET = config.jwtSecret;

function normalizePermissions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export function signToken(user: AuthUser): string {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new HttpError(500, 'JWT_SECRET não configurado corretamente.');
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    nome: user.nome || '',
    funcionario_permissoes: normalizePermissions(user.funcionario_permissoes),
  };

  return (jwt.sign as any)(payload, JWT_SECRET, {
    expiresIn: config.jwtExpiresIn || '7d',
  });
}

export function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Autenticação obrigatória.');
  }

  try {
    const token = header.replace('Bearer ', '').trim();

    if (!token) {
      throw new HttpError(401, 'Token não informado.');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    if (!decoded?.id || !decoded?.email) {
      throw new Error('Token sem dados obrigatórios.');
    }

    if (decoded.role === 'inactive') {
      throw new HttpError(403, 'Usuário inativo.');
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      nome: decoded.nome || '',
      funcionario_permissoes: normalizePermissions(decoded.funcionario_permissoes),
    };

    return next();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, 'Token inválido ou expirado.');
  }
}

export function admin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new HttpError(401, 'Usuário não autenticado.');
  }

  if (req.user.role !== 'admin') {
    throw new HttpError(403, 'Acesso restrito ao administrador.');
  }

  return next();
}

export function staff(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new HttpError(401, 'Usuário não autenticado.');
  }

  if (!['admin', 'funcionario'].includes(String(req.user.role))) {
    throw new HttpError(403, 'Acesso restrito ao administrador ou funcionário.');
  }

  return next();
}

export const authMiddleware = auth;
export const adminMiddleware = admin;
export const generateToken = signToken;
