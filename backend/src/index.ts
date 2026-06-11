import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { orderRoutes } from './routes/orders.js';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';
import { errorHandler, notFound } from './middleware/error.js';

export const app = express();
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));
app.get('/health', (_req,res)=>res.json({ ok:true, service:'grafica-premium-api' }));
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes, orderRoutes, publicRoutes);
app.use('/api/admin', adminRoutes);
app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
