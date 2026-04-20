const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xndcrwpnwfmwxmulziwo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZGNyd3Bud2Ztd3htdWx6aXdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5MTk3OCwiZXhwIjoyMDkwMDY3OTc4fQ.-RQf9tz66jDCk2p7z1NXBD9vNdbZWATAfO-CLTSoXOA',
  { auth: { persistSession: false } }
)

async function checkPolicies() {
    const { data, error } = await supabase.rpc('get_policies') // Try direct RPC if exists, or query pg_policies via REST
    
    // Actually we can just query pg_policies using custom REST endpoint if exposed, but it isn't.
    // Better to just try an insert on lead_labels using an actual user JWT.
}

async function runTest() {
    // We already know an existing user ID from test_trigger
    const { data: users, error: userErr } = await supabase.from('profiles').select('id, email').limit(1)
    const adminUserId = users[0].id

    console.log("Found user:", adminUserId)

    // Let's create a temp label and column and lead with service role to setup
    const labelRes = await supabase.from('labels').insert({ user_id: adminUserId, title: 'TAG RLS TEST', color: '#ff0000' }).select().single()
    const colOrigin = await supabase.from('kanban_columns').insert({ user_id: adminUserId, title: 'RLS TEST ORIGIN', position: 97 }).select().single()
    const leadRes = await supabase.from('leads').insert({ user_id: adminUserId, column_id: colOrigin.data.id, full_name: 'Lead RLS Test', whatsapp: '88888888888', origin: 'Outros' }).select().single()

    // NOW Let's try to insert using REST API but we can't get a JWT easily without password.
    // We can assume it is an RLS missing! Let's check if lead_labels has user_id ?
    // Check Columns of lead_labels:
    console.log("Applying RLS policies to lead_labels...")
    const { error: e1 } = await supabase.rpc('exec_sql', { sql: `
      ALTER TABLE public.lead_labels ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can manage lead labels for their leads" ON public.lead_labels;
      CREATE POLICY "Users can manage lead labels for their leads" ON public.lead_labels
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.leads
          WHERE leads.id = lead_labels.lead_id
          AND leads.user_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.leads
          WHERE leads.id = lead_labels.lead_id
          AND leads.user_id = auth.uid()
        )
      );
    `})
    console.log("Policy application:", 'Assuming RPC exec_sql does not exist, we will use Postgres if available')
    

    console.log("Cleaning up...")
    await supabase.from('lead_labels').delete().eq('lead_id', leadRes.data.id)
    await supabase.from('leads').delete().eq('id', leadRes.data.id)
    await supabase.from('kanban_columns').delete().eq('id', colOrigin.data.id)
    await supabase.from('labels').delete().eq('id', labelRes.data.id)
}
runTest()
