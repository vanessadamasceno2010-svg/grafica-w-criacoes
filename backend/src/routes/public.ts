import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/http.js';
import { sendMail } from '../services/mail.js';

export const publicRoutes = Router();

publicRoutes.get('/configuracoes', asyncHandler(async (_req,res)=>{ const {rows}=await query('select chave,valor,tipo from configuracoes_site'); res.json(Object.fromEntries(rows.map((r:any)=>[r.chave,r.valor]))); }));

publicRoutes.post('/contatos', asyncHandler(async (req,res)=>{ const d=z.object({nome:z.string(),email:z.string().email(),telefone:z.string().optional(),assunto:z.string(),mensagem:z.string()}).parse(req.body); const {rows}=await query('insert into contatos_formulario(nome,email,telefone,assunto,mensagem,respondido) values($1,$2,$3,$4,$5,false) returning *',[d.nome,d.email,d.telefone||'',d.assunto,d.mensagem]); await sendMail(d.email,'Mensagem recebida','<p>Recebemos sua mensagem e responderemos em breve.</p>'); res.status(201).json(rows[0]); }));

publicRoutes.post('/avaliacoes', asyncHandler(async (req,res)=>{ const d=z.object({produto_id:z.string().uuid(),usuario_id:z.string().uuid(),nota:z.number().int().min(1).max(5),comentario:z.string()}).parse(req.body); const {rows}=await query('insert into avaliacoes(produto_id,usuario_id,nota,comentario,verificado) values($1,$2,$3,$4,false) returning *',[d.produto_id,d.usuario_id,d.nota,d.comentario]); res.status(201).json(rows[0]); }));
publicRoutes.get('/avaliacoes/:produto_id', asyncHandler(async (req,res)=>{ const {rows}=await query('select a.*,u.nome cliente_nome from avaliacoes a join users u on u.id=a.usuario_id where produto_id=$1 order by created_at desc',[req.params.produto_id]); res.json(rows); }));
