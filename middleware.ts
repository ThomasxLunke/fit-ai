import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// '/' is the public landing page — reachable whether or not you're logged
// in. A logged-in visitor isn't redirected away from it; the landing page's
// own header just swaps its CTA for one that reflects their auth state.
// There's no standalone /sign-in or /sign-up page anymore — that's now a
// dialog on the landing page (see components/landing/auth-dialog.tsx).
const publicPaths = ['/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let better-auth's own API routes handle themselves — this is what
  // establishes the session in the first place, so it can't require one.
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    // Send them to the landing page with the sign-in dialog pre-opened,
    // instead of a dedicated page that no longer exists.
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('auth', 'sign-in')
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
