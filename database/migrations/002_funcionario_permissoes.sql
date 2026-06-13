-- Execute este script uma vez no SQL Editor do Supabase.
-- Ele libera a função "funcionario" no enum de usuários.

DO $$
BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'funcionario';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
