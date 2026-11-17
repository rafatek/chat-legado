import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
  const isLocalEnv = process.env.NODE_ENV === 'development'

  let redirectUrl = `${origin}${next}`
  if (!isLocalEnv && forwardedHost) {
    redirectUrl = `https://${forwardedHost}${next}`
  }

  // 1. Fluxo PKCE: Se o código de autorização estiver presente na URL
  if (code) {
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }

    console.error('[Auth Callback] Erro ao trocar código por sessão:', error.message)
    return NextResponse.redirect(`${origin}/forgot-password?error=codigo_expirado`)
  }

  // 2. Fluxo Implícito / Hash: Se não houver code, mas houver parâmetro "next" (ex: /update-password)
  // Redireciona diretamente para a página de destino preservando qualquer hash client-side (#access_token=...)
  if (next && next !== '/') {
    return NextResponse.redirect(redirectUrl)
  }

  // 3. Fallback amigável se a requisição não tiver código nem destino
  return NextResponse.redirect(`${origin}/forgot-password?error=link_invalido`)
}
