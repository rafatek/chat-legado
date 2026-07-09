import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
    const url = new URL(request.url)
    const host = url.origin // e.g. http://localhost:3000

    // Pegar o usuário atual da sessão
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.redirect(`${host}/login?error=auth_required`)
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${host}/api/auth/google/callback`
    )

    // Scopes needed for Calendar
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
    ]

    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Gets refresh token
        scope: scopes,
        prompt: 'consent', // Forces consent screen to always get refresh token
        state: user.id // Passa o user_id no state para não perder no callback
    })

    return NextResponse.redirect(authorizationUrl)
}
