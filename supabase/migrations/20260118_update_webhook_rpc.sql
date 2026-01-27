-- Atualização da função para vincular leads à coluna 'Novos Leads' ou Posição 0
-- Esta função substitui a anterior para incluir a lógica de coluna

CREATE OR REPLACE FUNCTION process_webhook_leads(
  p_token TEXT,
  p_leads JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_column_id UUID;
  v_lead JSONB;
  v_count INT := 0;
BEGIN
  -- 1. Validar Token e Obter ID do Usuário
  SELECT id INTO v_user_id
  FROM profiles
  WHERE webhook_token = p_token AND subscription_status = 'active';

  IF v_user_id IS NULL THEN
     RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou assinatura inativa');
  END IF;

  -- 2. Obter ID da Coluna "Novos Leads" (ou fallback para a primeira coluna / posição 0)
  -- Tenta achar pelo nome exato primeiro
  SELECT id INTO v_column_id
  FROM kanban_columns
  WHERE user_id = v_user_id AND title = 'Novos Leads'
  LIMIT 1;

  -- Se não achar pelo nome, pega a primeira coluna pela posição (geralmente posição 0)
  IF v_column_id IS NULL THEN
    SELECT id INTO v_column_id
    FROM kanban_columns
    WHERE user_id = v_user_id
    ORDER BY position ASC
    LIMIT 1;
  END IF;

  -- 3. Iterar e Inserir
  FOR v_lead IN SELECT * FROM jsonb_array_elements(p_leads)
  LOOP
    INSERT INTO leads (
      user_id,
      full_name,
      whatsapp,
      company_name,
      origin,
      folder,
      column_id, -- Novo campo
      created_at
    )
    VALUES (
      v_user_id,
      (v_lead->>'full_name'),
      (v_lead->>'whatsapp'),
      (v_lead->>'company_name'),
      (v_lead->>'origin'),
      'Sem pasta',
      v_column_id, -- Vincula à coluna encontrada
      NOW()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count, 'column_id', v_column_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
