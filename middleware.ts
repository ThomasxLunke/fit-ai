import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  // if (!sessionCookie) {
  //   return NextResponse.redirect(new URL('/sign-in', request.url))
  // }

  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
