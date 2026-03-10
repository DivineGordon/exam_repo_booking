import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await getSession()
  const path = request.nextUrl.pathname

  // Public routes
  const publicRoutes = ['/', '/login', '/register']
  const isPublicRoute = publicRoutes.includes(path)

  // Protected routes
  const isProtectedRoute = path.startsWith('/dashboard')

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (session && (path === '/login' || path === '/register')) {
    if (session.role === 'BUSINESS') {
      return NextResponse.redirect(new URL('/dashboard/business', request.url))
    } else {
      return NextResponse.redirect(new URL('/dashboard/consumer', request.url))
    }
  }

  // Role-based route protection
  if (session && isProtectedRoute) {
    if (path.startsWith('/dashboard/business') && session.role !== 'BUSINESS') {
      return NextResponse.redirect(new URL('/dashboard/consumer', request.url))
    }
    if (path.startsWith('/dashboard/consumer') && session.role !== 'CONSUMER') {
      return NextResponse.redirect(new URL('/dashboard/business', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
