import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, hasDatabaseUrl } from '../db/pool.js';
import { auth, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

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
    const result = await query('select now() as agora');

    return res.json({
      ok: true,
      database: 'conectado',
      agora: result.rows[0].agora
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: 'Falha ao conectar no banco.',
      error: error?.message || String(error),
      code: error?.code || null
    });
  }
});

authRoutes.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const senhaHash = await bcrypt.hash(data.senha, 10);

  const { rows } = await query(
    `
    insert into users(email, nome, telefone, senha, role, created_at, updated_at)
    values($1, $2, $3, $4, $5, now(), now())
    returning id, email, nome, telefone, role
    `,
    [data.email, data.nome, data.telefone || '', senhaHash, 'user']
  );

  const user = rows[0];

  res.status(201).json({
    user,
    token: signToken(user)
  });
}));

authRoutes.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const { rows } = await query(
    `
    select id, email, nome, telefone, role, senha
    from users
    where lower(email) = lower($1)
    limit 1
    `,
    [data.email]
  );

  const user = rows[0];

  if (!user) {
    throw new HttpError(401, 'Email ou senha inválidos.');
  }

  if (!user.senha) {
    throw new HttpError(401, 'Usuário sem senha cadastrada.');
  }

  let senhaValida = false;

  if (String(user.senha).startsWith('$2a$') || String(user.senha).startsWith('$2b$')) {
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
