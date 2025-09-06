import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-next-pathname', request.nextUrl.pathname)

  // Protect the quick-entry route
  if (request.nextUrl.pathname === '/quick-entry') {
    // In a real implementation, you would check authentication here
    // For now, we'll allow access but this shows where the protection would be implemented
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}
