"use server"

import { createAdminClient } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"

async function verifyAdmin() {
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    
    if (!user) throw new Error("Não autenticado")

    const { data: profile } = await supabaseUser
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()

    if (!profile?.is_admin) {
        throw new Error("Ação não autorizada. Apenas administradores podem realizar esta operação.")
    }
}

export async function getAdminProfiles() {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()

        // 1. Fetch all profiles
        const { data: profilesData, error: profilesError } = await supabaseAdmin
            .from("profiles")
            .select("*")

        if (profilesError) {
            console.error(`Error fetching profiles: [${profilesError.code}] ${profilesError.message}`)
            return { success: false, error: profilesError.message }
        }

        // 2. Fetch all whatsapp_connections
        const { data: waData, error: waError } = await supabaseAdmin
            .from("whatsapp_connections")
            .select("user_id, status")

        if (waError) {
            console.error(`Error fetching whatsapp connections: [${waError.code}] ${waError.message}`)
            // We don't fail the whole request, just log it.
        }

        // 3. Map status to profiles (profiles.id == whatsapp_connections.user_id)
        const processedData = profilesData.map(profile => {
            let waStatus = 'disconnected'
            if (waData) {
                const conn = waData.find(w => w.user_id === profile.id)
                if (conn && conn.status) {
                    waStatus = conn.status
                }
            }
            return {
                ...profile,
                whatsapp_status: waStatus
            }
        })

        return { success: true, data: processedData }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateSubscriptionStatus(userId: string, status: string) {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: status })
            .eq("id", userId)

        if (error) {
            console.error("Error updating subscription status:", error)
            return { success: false, error: error.message }
        }

        revalidatePath("/admin")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function toggleAdminRole(userId: string, isAdmin: boolean) {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_admin: isAdmin })
            .eq("id", userId)

        if (error) {
            console.error("Error toggling admin role:", error)
            return { success: false, error: error.message }
        }

        revalidatePath("/admin")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateProfileEmail(userId: string, email: string) {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()

        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ email: email })
            .eq("id", userId)

        if (profileError) {
            console.error("Error updating profile email:", profileError)
            return { success: false, error: profileError.message }
        }

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: email,
            email_confirm: true 
        })

        if (authError) {
            console.error("Error updating auth user email:", authError)
        }

        revalidatePath("/admin")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteAdminUser(userId: string) {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()
        
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        
        if (error) {
            console.error("Error deleting user:", error)
            return { success: false, error: error.message }
        }

        revalidatePath("/admin")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createAdminUser(data: { email: string, password?: string, fullName: string, whatsapp?: string, subscription_id?: string }) {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password || "Temporaria123!",
            email_confirm: true,
            user_metadata: {
                full_name: data.fullName,
                whatsapp: data.whatsapp || "",
                subscription_status: "active",
                subscription_id: data.subscription_id || ""
            }
        })
        
        if (authError) {
            console.error("Error creating auth user:", authError)
            return { success: false, error: authError.message }
        }
        
        // A inserção manual na tabela profiles foi removida.
        // Agora o sistema confia na Trigger/Function do próprio Supabase para espelhar a criação
        // utilizando o user_metadata enviado acima, exatamente como o n8n faz.

        revalidatePath("/admin")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getAdminWhatsappConnection(userId: string) {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()

        const { data, error } = await supabaseAdmin
            .from("whatsapp_connections")
            .select("instance_name, instance_key, status")
            .eq("user_id", userId)
            .single()

        if (error) {
            console.error("Error fetching whatsapp connection:", error)
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function adminCreateWhatsappInstanceForUser(userId: string) {
    try {
        await verifyAdmin()
        const supabaseAdmin = await createAdminClient()

        // 1. ZOMBIE CLEANUP
        const { data: existingConn } = await supabaseAdmin
            .from("whatsapp_connections")
            .select("instance_name, instance_key")
            .eq("user_id", userId)
            .single()

        if (existingConn?.instance_name) {
            const { deleteWhatsappInstance } = await import("@/lib/actions/whatsapp")
            await deleteWhatsappInstance(existingConn.instance_name)
            await supabaseAdmin.from("whatsapp_connections").delete().eq("user_id", userId)
        }

        // 2. WEBHOOK TOKEN
        const { data: profile } = await supabaseAdmin.from("profiles").select("webhook_token").eq("id", userId).single()
        let currentWebhookToken = profile?.webhook_token
        if (!currentWebhookToken) {
            currentWebhookToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0
                const v = c === 'x' ? r : (r & 0x3 | 0x8)
                return v.toString(16)
            })
            await supabaseAdmin.from('profiles').update({ webhook_token: currentWebhookToken }).eq('id', userId)
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const webhookUrl = `${appUrl}/api/webhook/${currentWebhookToken}`

        // 3. CREATE INSTANCE
        const shortId = userId.slice(0, 3).toUpperCase()
        const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
        const newInstanceName = `LEG-${shortId}-${randomSuffix}`

        const payload = {
            name: newInstanceName,
            systemName: "apilocal",
            fingerprintProfile: "chrome",
            browser: "chrome",
            webhook: webhookUrl,
            webhookEvents: ["messages.upsert", "messages.update", "message", "MESSAGES_UPSERT"],
            webhookByEvents: false,
        }

        const { initWhatsappInstance } = await import("@/lib/actions/whatsapp")
        const res = await initWhatsappInstance(payload)
        const data = res.data

        let token = ""
        if (res.ok && data.token) token = data.token
        else if (data.hash && data.hash.token) token = data.hash.token
        else token = data.token || "ERRO"

        if (res.ok && token !== "ERRO") {
            const { error: dbError } = await supabaseAdmin.from("whatsapp_connections").upsert({
                user_id: userId,
                instance_name: newInstanceName,
                instance_key: token,
                status: "connecting",
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

            if (dbError) throw dbError

            return { success: true, instance_name: newInstanceName, instance_key: token }
        } else {
            return { success: false, error: data.message || "Erro desconhecido na UazAPI" }
        }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
