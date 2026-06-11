import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

const jwtSecret: Secret = String(config.jwtSecret || process.env.JWT_SECRET || 'segredo-temporario-dev');

export function generateToken(user: { id: string; email: string; role: 'user' | 'admin' }) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const options: SignOptions = {
    expiresIn: '7d'
  };

  return jwt.sign(payload, jwtSecret, options);
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        message: 'Token não informado'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'Token inválido'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload & {
      id: string;
      email: string;
      role: 'user' | 'admin';
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Sessão expirada ou token inválido'
    });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: 'Usuário não autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      ok: false,
      message: 'Acesso permitido apenas para administradores'
    });
  }

  return next();
}
