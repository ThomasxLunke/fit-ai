import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const publicPaths = ['/sign-in', '/sign-up']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let better-auth's own API routes handle themselves — this is what
  // establishes the session in the first place, so it can't require one.
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)

  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
