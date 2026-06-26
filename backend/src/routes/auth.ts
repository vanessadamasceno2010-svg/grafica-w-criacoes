import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { auth, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { supabaseRest } from '../lib/supabaseRest.js';

export const authRoutes = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  },
});

const registerSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(2),
  telefone: z.string().optional(),
  senha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function normalizePermissions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function safeUserFromDb(user: any) {
  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    telefone: user.telefone || '',
    role: user.role || 'user',
    funcionario_permissoes: normalizePermissions(user.funcionario_permissoes),
  };
}

authRoutes.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const email = normalizeEmail(data.email);

    const existing = await supabaseRest<any[]>(
      `/users?select=id,email&email=eq.${encodeURIComponent(email)}&limit=1`
    );

    if (existing.length > 0) {
      throw new HttpError(409, 'Já existe uma conta com este email.');
    }

    const senhaHash = await bcrypt.hash(data.senha, 12);

    const users = await supabaseRest<any[]>('/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        nome: data.nome.trim(),
        telefone: data.telefone || '',
        senha: senhaHash,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    const user = users[0];

    if (!user) {
      throw new HttpError(500, 'Não foi possível criar o usuário.');
    }

    const safeUser = safeUserFromDb(user);

    res.status(201).json({
      user: safeUser,
      token: signToken(safeUser),
    });
  })
);

authRoutes.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const email = normalizeEmail(data.email);

    const users = await supabaseRest<any[]>(
      `/users?select=id,email,nome,telefone,role,senha,funcionario_permissoes&email=eq.${encodeURIComponent(email)}&limit=1`
    );

    const user = users[0];

    if (!user || !user.senha) {
      throw new HttpError(401, 'Email ou senha inválidos.');
    }

    const senhaBanco = String(user.senha);

    if (!senhaBanco.startsWith('$2a$') && !senhaBanco.startsWith('$2b$')) {
      throw new HttpError(
        401,
        'Senha precisa ser redefinida por segurança. Fale com o administrador.'
      );
    }

    const senhaValida = await bcrypt.compare(data.senha, senhaBanco);

    if (!senhaValida) {
      throw new HttpError(401, 'Email ou senha inválidos.');
    }

    if (user.role === 'inactive') {
      throw new HttpError(403, 'Usuário inativo.');
    }

    const safeUser = safeUserFromDb(user);

    res.json({
      user: safeUser,
      token: signToken(safeUser),
    });
  })
);

authRoutes.post('/logout', auth, (_req, res) => {
  res.json({ ok: true });
});

authRoutes.post('/refresh-token', auth, (req, res) => {
  res.json({
    token: signToken(req.user!),
  });
});
