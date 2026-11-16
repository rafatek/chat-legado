-- ================================================================
-- MIGRATION: Trigger Automático para Modo Proativo
-- Todo lead criado no sistema (WhatsApp, Kanban, Planilha, Webhook)
-- entra automaticamente na fila de agendamentos e com RMK Ativo.
-- ================================================================

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

