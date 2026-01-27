export interface AgentConfig {
    id?: string
    user_id?: string
    agent_type: 'atendimento' | 'prospeccao'
    is_active: boolean
    agent_name: string
    personality: string
    response_interval: number // in minutes
    target_audience: 'all' | 'clients_only'
    pauser_permanente?: boolean
    meta_data?: Record<string, any>
    created_at?: string
    updated_at?: string
}

export interface ProspectingConfig {
    id?: string
    user_id?: string
    agent_prompt: string
    personality?: string[]
    default_messages?: string[]
    is_active?: boolean
    created_at?: string
    updated_at?: string
}
