import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('better-auth.session_token')
    const isLoggedIn = !!sessionCookie?.value

    const { pathname } = request.nextUrl

    // Protected routes
    const isProtectedRoute =
        pathname.startsWith('/dashboard') || pathname.startsWith('/meeting')

    // Auth routes (login, signup)
    const isAuthRoute =
        pathname.startsWith('/login') || pathname.startsWith('/signup')

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !isLoggedIn) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect to dashboard if accessing auth routes while logged in
    if (isAuthRoute && isLoggedIn) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
