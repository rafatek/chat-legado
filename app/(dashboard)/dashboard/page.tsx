"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, MessageSquare, TrendingUp, Zap, Megaphone, Smartphone, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Metrics State
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    activeCampaigns: 0,
    totalMessagesSent: 0,
    connectionStatus: "disconnected", // disconnected, connected
    connectionInstance: ""
  })

  // Charts State
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [sourceData, setSourceData] = useState<any[]>([])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.replace("/login")
          return
        }

        setUser(user)
        fetchDashboardData(user.id)
      } catch (error) {
        console.error("Error checking auth:", error)
        router.replace("/login")
      }
    }

    checkUser()
  }, [router])

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true)

      // 1. Connection Status
      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("status, instance_name")
        .eq("user_id", userId)
        .single()

      const connectionStatus = conn?.status === "connected" ? "connected" : "disconnected"
      const connectionInstance = conn?.instance_name || ""

      // 2. Active Campaigns
      const { count: activeCampaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active")

      // 3. Total Messages Sent (Aggregation across all campaigns)
      // We need to find campaigns owned by user first, then count sent leads
      // Assuming RLS allows us to just query campaign_leads joined with campaigns? 
      // campaign_leads usually doesn't have user_id. We fetch campaigns first.
      const { data: userCampaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("user_id", userId)

      let totalMessages = 0
      if (userCampaigns && userCampaigns.length > 0) {
        const campaignIds = userCampaigns.map(c => c.id)
        const { count: msgCount } = await supabase
          .from("campaign_leads")
          .select("*", { count: "exact", head: true })
          .in("campaign_id", campaignIds)
          .eq("status", "sent")

        totalMessages = msgCount || 0
      }

      // 4. Leads & Charts Data
      // Fetch all leads to compute totals and aggregations locally to save requests
      const { data: allLeads, count: totalLeadsCount } = await supabase
        .from("leads")
        .select("id, origin, column_id", { count: 'exact' })
        .eq("user_id", userId)

      const totalLeads = totalLeadsCount || 0

      // Process Source Data
      const sourcesMap: Record<string, number> = {}
      allLeads?.forEach(lead => {
        const origin = lead.origin || "Outros"
        sourcesMap[origin] = (sourcesMap[origin] || 0) + 1
      })

      const processedSourceData = Object.keys(sourcesMap).map(key => ({
        name: key,
        value: sourcesMap[key]
      })).sort((a, b) => b.value - a.value)

      // Process Funnel Data
      // Fetch columns first
      const { data: columns } = await supabase
        .from("kanban_columns")
        .select("id, title, position")
        .eq("user_id", userId)
        .order("position")

      let processedFunnelData: any[] = []
      if (columns) {
        processedFunnelData = columns.map(col => {
          const count = allLeads?.filter(l => l.column_id === col.id).length || 0
          return {
            name: col.title,
            leads: count
          }
        })
      }

      setMetrics({
        totalLeads,
        activeCampaigns: activeCampaignsCount || 0,
        totalMessagesSent: totalMessages,
        connectionStatus,
        connectionInstance
      })

      setSourceData(processedSourceData)
      setFunnelData(processedFunnelData)

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const hora = new Date().getHours();
  let saudacao = "";
  if (hora >= 5 && hora < 12) {
    saudacao = "Bom dia";
  } else if (hora >= 12 && hora < 18) {
    saudacao = "Boa tarde";
  } else {
    saudacao = "Boa noite";
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight">
          Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Visitante'}! {saudacao}!
        </h1>
        <p className="text-muted-foreground">Bem-vindo ao seu painel de controle.</p>
      </div>

      {/* Connection Status Banner (if disconnected) */}
      {metrics.connectionStatus !== "connected" && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold text-red-500">WhatsApp Desconectado</h3>
              <p className="text-xs text-red-400">Suas campanhas não serão enviadas.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/20 text-red-500 hover:bg-red-500/10"
            onClick={() => router.push("/conexoes")}
          >
            Conectar Agora
          </Button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">{metrics.totalLeads}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Na sua base de dados</p>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">{metrics.activeCampaigns}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Rodando atualmente</p>
          </CardContent>
        </Card>

        {/* Messages Sent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">{metrics.totalMessagesSent}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total de disparos realizados</p>
          </CardContent>
        </Card>

        {/* Connection Status Card (Small) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Status da Conexão</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-2">
                {metrics.connectionStatus === 'connected' ? (
                  <div className="flex items-center gap-1.5 text-green-500 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-500 font-bold">
                    <XCircle className="h-4 w-4" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            )}
            {metrics.connectionStatus === 'connected' && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{metrics.connectionInstance}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-7">

        {/* CRM Funnel Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Funil de Vendas (CRM)</CardTitle>
            <CardDescription>Quantidade de leads em cada etapa</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full w-full bg-muted/10 rounded animate-pulse flex items-center justify-center">Carregando gráfico...</div>
              ) : funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: '#ffffff10' }}
                    />
                    <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados no CRM
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Fontes de Leads</CardTitle>
            <CardDescription>Origem da sua base de contatos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full w-full bg-muted/10 rounded animate-pulse flex items-center justify-center">Carregando gráfico...</div>
              ) : sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados de fontes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
