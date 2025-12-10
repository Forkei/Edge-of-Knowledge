import { NextRequest, NextResponse } from 'next/server'
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  invalidateSession,
  SESSION_COOKIE_NAME,
} from '@/lib/auth'

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Verify password
    if (!verifyPassword(password)) {
      // Add a small delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create session
    const sessionToken = await createSession()

    // Create response with session cookie
    const response = NextResponse.json({ success: true })
    setSessionCookie(response, sessionToken)

    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (sessionCookie?.value) {
    invalidateSession(sessionCookie.value)
  }

  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)

  return response
}

// GET - Check auth status
export async function GET(request: NextRequest) {
  // If no password is set, always authenticated
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json({ authenticated: true, passwordRequired: false })
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return NextResponse.json({ authenticated: false, passwordRequired: true })
  }

  // Import validateSession here to check
  const { validateSession } = await import('@/lib/auth')
  const isValid = validateSession(sessionCookie.value)

  return NextResponse.json({
    authenticated: isValid,
    passwordRequired: true
  })
}
