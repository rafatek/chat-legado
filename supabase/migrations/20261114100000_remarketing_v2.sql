-- ================================================================
-- MIGRATION: Remarketing V2 (Agente Passivo & Proativo + Fila de Agendamento)
-- ================================================================

-- 1. Novas colunas na tabela de configurações de remarketing
ALTER TABLE public.remarketing_configs
ADD COLUMN IF NOT EXISTS agent_mode TEXT DEFAULT 'passive',
ADD COLUMN IF NOT EXISTS time_rules JSONB DEFAULT '[
  {"id": "1", "days": 0, "hours": 0, "minutes": 30, "label": "Após 30 minutos"},
  {"id": "2", "days": 0, "hours": 2, "minutes": 0, "label": "Após 2 horas"},
  {"id": "3", "days": 1, "hours": 0, "minutes": 0, "label": "Após 1 dia"}
]'::jsonb;

-- 2. Nova tabela: Fila de agendamentos de remarketing
CREATE TABLE IF NOT EXISTS public.remarketing_queue (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id      UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  step         INT NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  metadata     JSONB DEFAULT '{}'::jsonb
);

-- 3. Índices de alta performance para consulta do cron (n8n) e exclusão rápida
CREATE INDEX IF NOT EXISTS idx_rmk_queue_scheduled
  ON public.remarketing_queue(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_rmk_queue_lead
  ON public.remarketing_queue(lead_id);

CREATE INDEX IF NOT EXISTS idx_rmk_queue_user
  ON public.remarketing_queue(user_id);

-- 4. RLS (Row Level Security)
ALTER TABLE public.remarketing_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remarketing_queue' AND policyname = 'Users can view own queue') THEN
    CREATE POLICY "Users can view own queue" ON public.remarketing_queue FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remarketing_queue' AND policyname = 'Users can insert own queue') THEN
    CREATE POLICY "Users can insert own queue" ON public.remarketing_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remarketing_queue' AND policyname = 'Users can update own queue') THEN
    CREATE POLICY "Users can update own queue" ON public.remarketing_queue FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remarketing_queue' AND policyname = 'Users can delete own queue') THEN
    CREATE POLICY "Users can delete own queue" ON public.remarketing_queue FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Função oficial consumida pelo N8N para buscar disparos prontos
-- Regras inteligentes:
-- • Exige WhatsApp conectado (wc.status = 'connected')
-- • MODO PROATIVO: Só segura o disparo se o cliente falou nos últimos 10 minutos (conversa ao vivo).
-- • MODO PASSIVO: Se o cliente respondeu após a criação do agendamento, não dispara.
CREATE OR REPLACE FUNCTION get_pending_remarketing_queue()
RETURNS TABLE (
  queue_id UUID,
  step INT,
  scheduled_at TIMESTAMPTZ,
  lead_id UUID,
  lead_name TEXT,
  lead_phone TEXT,
  conversation_id UUID,
  user_id UUID,
  instance_name TEXT,
  instance_key TEXT,
  ai_prompt TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rq.id AS queue_id,
    rq.step,
    rq.scheduled_at,
    l.id AS lead_id,
    l.full_name AS lead_name,
    l.whatsapp AS lead_phone,
    l.conversation_id,
    u.id AS user_id,
    wc.instance_name,
    wc.instance_key,
    rc.ai_prompt
  FROM public.remarketing_queue rq
  JOIN public.leads l ON l.id = rq.lead_id
  JOIN public.profiles u ON u.id = rq.user_id
  JOIN public.remarketing_configs rc ON rc.user_id = rq.user_id AND rc.is_active = true
  JOIN public.whatsapp_connections wc ON wc.user_id = rq.user_id AND wc.status = 'connected'
  WHERE 
    rq.scheduled_at <= NOW()
    AND (
      -- MODO PROATIVO: Trava leve de 10 minutos apenas para não interromper conversa em tempo real
      (
        rc.agent_mode = 'proactive'
        AND NOT EXISTS (
          SELECT 1 FROM public.messages m 
          WHERE m.lead_id = l.id 
            AND m.from_me = false 
            AND m.created_at >= NOW() - INTERVAL '10 minutes'
        )
      )
      OR
      -- MODO PASSIVO: Se o lead respondeu após a criação da fila, segura o disparo
      (
        (rc.agent_mode IS NULL OR rc.agent_mode != 'proactive')
        AND NOT EXISTS (
          SELECT 1 FROM public.messages m 
          WHERE m.lead_id = l.id 
            AND m.from_me = false 
            AND m.created_at >= rq.created_at
        )
      )
    )
  ORDER BY rq.scheduled_at ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Restrição de segurança: apenas o service_role (N8N / backend) pode executar esta função
REVOKE EXECUTE ON FUNCTION get_pending_remarketing_queue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_pending_remarketing_queue() TO service_role;

-- 7. Trigger Automático para Modo Proativo:
-- Todo lead criado no sistema (WhatsApp, Kanban, Planilha, Webhook)
-- entra automaticamente na fila de agendamentos e com RMK Ativo.
CREATE OR REPLACE FUNCTION handle_new_lead_proactive_remarketing()
RETURNS TRIGGER AS $$
DECLARE
  v_config RECORD;
  v_rule RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_step INT := 1;
  v_total_minutes INT;
BEGIN
  -- 1. Busca configuração de remarketing do usuário
  SELECT is_active, agent_mode, time_rules
  INTO v_config
  FROM public.remarketing_configs
  WHERE user_id = NEW.user_id;

  -- 2. Se o remarketing estiver ativo e em modo proativo
  IF v_config.is_active = true AND v_config.agent_mode = 'proactive' THEN
    -- Marca em remarketing_leads como rmk_enabled = true
    INSERT INTO public.remarketing_leads (lead_id, user_id, rmk_enabled, remarketing_status, remarketing_attempts, last_remarketing_at)
    VALUES (NEW.id, NEW.user_id, true, 'none', 0, v_now)
    ON CONFLICT (lead_id) DO UPDATE
    SET rmk_enabled = true,
        updated_at = v_now;

    -- Deleta agendamentos anteriores (se houver) para evitar duplicatas
    DELETE FROM public.remarketing_queue
    WHERE lead_id = NEW.id;

    -- Insere cada etapa de horário configurada na fila
    IF v_config.time_rules IS NOT NULL AND jsonb_array_length(v_config.time_rules) > 0 THEN
      FOR v_rule IN SELECT * FROM jsonb_to_recordset(v_config.time_rules) AS x(
        id text, days int, hours int, minutes int, label text
      )
      LOOP
        v_total_minutes := (COALESCE(v_rule.days, 0) * 1440) + (COALESCE(v_rule.hours, 0) * 60) + COALESCE(v_rule.minutes, 0);
        
        IF v_total_minutes > 0 THEN
          INSERT INTO public.remarketing_queue (
            user_id,
            lead_id,
            step,
            scheduled_at,
            metadata
          ) VALUES (
            NEW.user_id,
            NEW.id,
            v_step,
            v_now + (v_total_minutes * INTERVAL '1 minute'),
            jsonb_build_object(
              'label', COALESCE(v_rule.label, 'Etapa ' || v_step),
              'days', COALESCE(v_rule.days, 0),
              'hours', COALESCE(v_rule.hours, 0),
              'minutes', COALESCE(v_rule.minutes, 0)
            )
          );
          v_step := v_step + 1;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger na tabela leads
DROP TRIGGER IF EXISTS trg_new_lead_proactive_remarketing ON public.leads;
CREATE TRIGGER trg_new_lead_proactive_remarketing
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION handle_new_lead_proactive_remarketing();



