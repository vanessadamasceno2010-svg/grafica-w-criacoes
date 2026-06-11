import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { auth, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { sendMail } from '../services/mail.js';

export const authRoutes = Router();

const registerSchema = z.object({ email: z.string().email(), nome: z.string().min(2), telefone: z.string().optional(), senha: z.string().min(8) });
const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(1) });

authRoutes.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const senhaHash = await bcrypt.hash(data.senha, 12);
  const { rows } = await query('insert into users(email,nome,telefone,senha,role) values($1,$2,$3,$4,$5) returning id,email,nome,role', [data.email, data.nome, data.telefone || '', senhaHash, 'user']);
  const user = rows[0];
  res.status(201).json({ user, token: signToken(user) });
}));

authRoutes.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const { rows } = await query('select id,email,nome,role,senha from users where email=$1 limit 1', [data.email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(data.senha, user.senha))) throw new HttpError(401, 'Email ou senha inválidos.');
  const safeUser = { id: user.id, email: user.email, nome: user.nome, role: user.role };
  res.json({ user: safeUser, token: signToken(safeUser) });
}));

authRoutes.post('/logout', auth, (_req, res) => res.json({ ok: true }));
authRoutes.post('/refresh-token', auth, (req, res) => res.json({ token: signToken(req.user!) }));

authRoutes.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  await sendMail(email, 'Recuperação de senha', '<p>Recebemos sua solicitação. Entre em contato com o suporte para redefinir com segurança.</p>');
  res.json({ message: 'Instruções enviadas para o email informado quando ele existir em nossa base.' });
}));

authRoutes.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, novaSenha } = z.object({ email: z.string().email(), novaSenha: z.string().min(8) }).parse(req.body);
  const senhaHash = await bcrypt.hash(novaSenha, 12);
  await query('update users set senha=$1, updated_at=now() where email=$2', [senhaHash, email]);
  res.json({ message: 'Senha redefinida.' });
}));
