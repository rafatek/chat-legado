-- ==============================================================================
-- MIGRATION: Corrigir Foreign Keys para Permitir Exclusão em Cascata de Usuários
-- 
-- Problema:
-- Ao tentar deletar um usuário (seja pelo Painel Supabase online em Authentication > Users,
-- ou pelo sistema), o PostgreSQL bloqueava com "Database error deleting user"
-- (código 23503 - violação de chave estrangeira) porque várias tabelas apontavam
-- para public.profiles ou auth.users sem a cláusula ON DELETE CASCADE.
-- ==============================================================================

-- 1. whatsapp_connections (referencia auth.users ou profiles sem cascade)
ALTER TABLE public.whatsapp_connections 
  DROP CONSTRAINT IF EXISTS whatsapp_connections_user_id_fkey;

ALTER TABLE public.whatsapp_connections 
  ADD CONSTRAINT whatsapp_connections_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. conversations (referencia public.profiles sem cascade)
ALTER TABLE public.conversations 
  DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

ALTER TABLE public.conversations 
  ADD CONSTRAINT conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. messages (referencia public.profiles sem cascade)
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE public.messages 
  ADD CONSTRAINT messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. agents_configs (referencia public.profiles sem cascade)
ALTER TABLE public.agents_configs 
  DROP CONSTRAINT IF EXISTS agents_configs_user_id_fkey;

ALTER TABLE public.agents_configs 
  ADD CONSTRAINT agents_configs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. remarketing_configs (referencia public.profiles sem cascade)
ALTER TABLE public.remarketing_configs 
  DROP CONSTRAINT IF EXISTS remarketing_configs_user_id_fkey;

ALTER TABLE public.remarketing_configs 
  ADD CONSTRAINT remarketing_configs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. prospecting_configs (caso exista no banco)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospecting_configs') THEN
    ALTER TABLE public.prospecting_configs DROP CONSTRAINT IF EXISTS prospecting_configs_user_id_fkey;
    ALTER TABLE public.prospecting_configs 
      ADD CONSTRAINT prospecting_configs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
