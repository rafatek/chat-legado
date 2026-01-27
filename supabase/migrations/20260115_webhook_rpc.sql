-- Function to process webhook leads securely
-- This function runs with SECURITY DEFINER to bypass RLS, validating the token internally.

CREATE OR REPLACE FUNCTION process_webhook_leads(
  p_token TEXT,
  p_leads JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
DECLARE
  v_user_id UUID;
  v_lead JSONB;
  v_count INT := 0;
BEGIN
  -- 1. Validate Token and Get User ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE webhook_token = p_token AND subscription_status = 'active';

  IF v_user_id IS NULL THEN
     RETURN jsonb_build_object('success', false, 'error', 'Invalid token or subscription inactive');
  END IF;

  -- 2. Iterate and Insert
  -- p_leads is expected to be an array of objects: [{ "full_name": "...", "whatsapp": "...", "company_name": "...", "origin": "..." }]
  
  FOR v_lead IN SELECT * FROM jsonb_array_elements(p_leads)
  LOOP
    INSERT INTO leads (
      user_id,
      full_name,
      whatsapp,
      company_name,
      origin,
      folder,
      created_at
    )
    VALUES (
      v_user_id,
      (v_lead->>'full_name'),
      (v_lead->>'whatsapp'),
      (v_lead->>'company_name'),
      (v_lead->>'origin'),
      'Sem pasta',
      NOW()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
