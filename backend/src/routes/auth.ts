import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { checkSupabaseRestEnv, supabaseRest } from '../lib/supabaseRest.js';

export const authRoutes = Router();

const registerSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(2),
  telefone: z.string().optional(),
  senha: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1)
});

authRoutes.get('/db-test', async (_req, res) => {
  try {
    checkSupabaseRestEnv();

    const users = await supabaseRest<any[]>(
      '/users?select=id,email,nome,role&limit=1'
    );

    return res.json({
      ok: true,
      database: 'conectado via Supabase REST',
      users_count_test: Array.isArray(users) ? users.length : 0
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: 'Falha ao conectar no Supabase REST.',
      error: error?.message || String(error)
    });
  }
});

authRoutes.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const senhaHash = await bcrypt.hash(data.senha, 10);

  const users = await supabaseRest<any[]>('/users', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email.toLowerCase(),
      nome: data.nome,
      telefone: data.telefone || '',
      senha: senhaHash,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  const user = users[0];

  const safeUser = {
    id: user.id,
    email: user.email,
    nome: user.nome,
    telefone: user.telefone,
    role: user.role || 'user'
  };

  res.status(201).json({
    user: safeUser,
    token: signToken(safeUser)
  });
}));

authRoutes.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const email = encodeURIComponent(data.email.toLowerCase());

  const users = await supabaseRest<any[]>(
    `/users?select=id,email,nome,telefone,role,senha&email=eq.${email}&limit=1`
  );

  const user = users[0];

  if (!user) {
    throw new HttpError(401, 'Email ou senha inválidos.');
  }

  if (!user.senha) {
    throw new HttpError(401, 'Usuário sem senha cadastrada.');
  }

  let senhaValida = false;

  if (
    String(user.senha).startsWith('$2a$') ||
    String(user.senha).startsWith('$2b$')
  ) {
    senhaValida = await bcrypt.compare(data.senha, user.senha);
  } else {
    senhaValida = data.senha === user.senha;
  }

  if (!senhaValida) {
    throw new HttpError(401, 'Email ou senha inválidos.');
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    nome: user.nome,
    telefone: user.telefone,
    role: user.role || 'user'
  };

  res.json({
    user: safeUser,
    token: signToken(safeUser)
  });
}));

authRoutes.post('/logout', auth, (_req, res) => {
  res.json({ ok: true });
});

authRoutes.post('/refresh-token', auth, (req, res) => {
  res.json({
    token: signToken(req.user!)
  });
});
