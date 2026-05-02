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

        // Fetch all profiles using the service role to bypass RLS
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("*")

        if (error) {
            console.error(`Error fetching profiles: [${error.code}] ${error.message} | Details: ${error.details} | Hint: ${error.hint}`)
            return { success: false, error: error.message }
        }

        return { success: true, data }
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
