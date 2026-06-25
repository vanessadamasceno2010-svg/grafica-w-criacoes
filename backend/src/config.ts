import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

function getEnv(name: string, fallback = '') {
  const value = process.env[name];

  if (isProduction && !value && fallback === '') {
    throw new Error(`Variável obrigatória ausente em produção: ${name}`);
  }

  return value || fallback;
}

const jwtSecret = getEnv('JWT_SECRET', isProduction ? '' : 'dev-secret-change-me');

if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET fraco. Use uma chave com pelo menos 32 caracteres.');
}

if (isProduction && !process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL obrigatória em produção.');
}

if (isProduction && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY obrigatória em produção.');
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  port: Number(process.env.PORT || 3333),

  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:5173'),

  databaseUrl: process.env.DATABASE_URL || '',

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Gráfica W Criações',
  },
};
