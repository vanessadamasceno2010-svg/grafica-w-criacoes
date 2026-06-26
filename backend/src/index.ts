import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
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

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

function normalizeOrigin(origin?: string) {
  return String(origin || '').replace(/\/$/, '');
}

const configuredFrontendUrl = normalizeOrigin(config.frontendUrl);

const allowedOrigins = new Set(
  [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://grafica-w-criacoes-frontend.vercel.app',
    configuredFrontendUrl,
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
);

const vercelPreviewOrigin =
  /^https:\/\/grafica-w-criacoes-frontend(?:-[a-z0-9-]+)?\.vercel\.app$/i;

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = normalizeOrigin(origin);

    if (allowedOrigins.has(cleanOrigin) || vercelPreviewOrigin.test(cleanOrigin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo servidor.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
    },
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (config.isProduction) {
  app.use(
    morgan('combined', {
      skip: (req) => req.path === '/health',
    })
  );
} else {
  app.use(morgan('dev'));
}

app.get('/', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    message: 'API Gráfica W Criações online',
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'grafica-w-criacoes-api',
    environment: config.nodeEnv,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', orderRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const port = Number(config.port || process.env.PORT || 3001);

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`API Gráfica W Criações rodando na porta ${port}`);
  });
}

export default app;
