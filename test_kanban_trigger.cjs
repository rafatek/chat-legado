const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xndcrwpnwfmwxmulziwo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZGNyd3Bud2Ztd3htdWx6aXdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5MTk3OCwiZXhwIjoyMDkwMDY3OTc4fQ.-RQf9tz66jDCk2p7z1NXBD9vNdbZWATAfO-CLTSoXOA',
  { auth: { persistSession: false } }
)

async function runTest() {
  console.log("=== INICIANDO TESTE DA AUTOMAÇÃO KANBAN ===")
  
  // 1. Pega um usuário existente
  const { data: users, error: userErr } = await supabase.from('profiles').select('id').limit(1)
  if (userErr || users.length === 0) return console.log("Sem usuários:", userErr)
  const userId = users[0].id

  // 2. Cria uma Label
  const { data: label, error: labelErr } = await supabase.from('labels').insert({
    user_id: userId,
    title: 'TAG TESTE AUTOMAÇÃO',
    color: '#ff0000'
  }).select().single()
  if (labelErr) return console.log("Erro ao criar label:", labelErr)
  console.log("✅ Label criada:", label.title)

  // 3. Cria uma Coluna vinculada à Label
  const { data: col, error: colErr } = await supabase.from('kanban_columns').insert({
    user_id: userId,
    title: 'COLUNA TESTE AUTOMAÇÃO',
    position: 99,
    linked_label_id: label.id
  }).select().single()
  if (colErr) return console.log("Erro ao criar coluna vinculada:", colErr)
  console.log("✅ Coluna vinculada à Tag criada:", col.title)

  // 4. Cria outra Coluna padrão para o Lead ficar inicialmente
  const { data: colOrigin, error: colOriginErr } = await supabase.from('kanban_columns').insert({
    user_id: userId,
    title: 'COLUNA ORIGEM TESTE',
    position: 98
  }).select().single()
  if (colOriginErr) return console.log("Erro ao criar coluna de origem:", colOriginErr)
  
  // 5. Cria o Lead na coluna de Origem
  const { data: lead, error: leadErr } = await supabase.from('leads').insert({
    user_id: userId,
    column_id: colOrigin.id,
    full_name: 'Lead de Teste Automação',
    whatsapp: '99999999999',
    origin: 'Outros'
  }).select().single()
  if (leadErr) return console.log("Erro ao criar lead:", leadErr)
  console.log("✅ Lead criado na coluna inicial:", colOrigin.title)

  console.log("⏳ Aplicando a etiqueta no lead via DB...")
  // 6. Vincula a Label ao Lead (Isso deve disparar a Trigger e mover o Lead de coluna!)
  const { error: linkErr } = await supabase.from('lead_labels').insert({
    lead_id: lead.id,
    label_id: label.id
  })
  if (linkErr) return console.log("Erro ao vincular label:", linkErr)

  // 7. Busca o Lead de volta para ver em qual coluna ele está agora
  const { data: leadUpdated, error: fetchErr } = await supabase.from('leads').select('column_id').eq('id', lead.id).single()
  if (fetchErr) return console.log("Erro ao buscar lead:", fetchErr)

  if (leadUpdated.column_id === col.id) {
    console.log("🎉 SUCESSO! A trigger moveu o lead automaticamente para a coluna correta!")
  } else {
    console.log("❌ FALHA! O lead continuou na coluna", colOrigin.title)
  }
  
  console.log("Limpando ambiente de teste...")
  await supabase.from('lead_labels').delete().eq('lead_id', lead.id)
  await supabase.from('leads').delete().eq('id', lead.id)
  await supabase.from('kanban_columns').delete().in('id', [col.id, colOrigin.id])
  await supabase.from('labels').delete().eq('id', label.id)
  console.log("✅ Limpeza completa.")
}

runTest()
