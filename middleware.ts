import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes and their required roles
const PROTECTED_ROUTES = {
  '/dashboard': ['tech', 'supervisor', 'qaqc', 'admin'],
  '/quick-entry': ['tech', 'supervisor', 'qaqc', 'admin'],
  '/lj-chart': ['tech', 'supervisor', 'qaqc', 'admin'],
  '/reports': ['supervisor', 'qaqc', 'admin'],
  '/settings': ['admin'],
  '/admin': ['admin'],
}

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Check if the route requires specific roles
    for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        const userRole = token?.role as string
        
        if (!allowedRoles.includes(userRole)) {
          // Redirect to unauthorized page or dashboard
          const url = req.nextUrl.clone()
          url.pathname = '/unauthorized'
          return NextResponse.redirect(url)
        }
        break
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Configure which routes to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (authentication routes)
     * - public files in root
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}