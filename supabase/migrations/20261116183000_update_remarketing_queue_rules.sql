-- ================================================================
-- MIGRATION: Atualização da Função de Busca de Remarketing
-- Regras inteligentes:
-- • MODO PROATIVO: Trava de 10 minutos (não envia se o lead falou nos últimos 10 min)
-- • MODO PASSIVO: Não envia se o lead respondeu após a criação do agendamento
-- ================================================================

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
      -- MODO PROATIVO: Só segura se o lead falou nos últimos 10 minutos
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
      -- MODO PASSIVO: Se respondeu depois que o agendamento foi criado, não manda
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

-- Permissão restrita ao service_role
REVOKE EXECUTE ON FUNCTION get_pending_remarketing_queue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_pending_remarketing_queue() TO service_role;
