import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'eok_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Generate a secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// Hash the password + session for verification
async function hashToken(token: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token + secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Store valid sessions (in-memory for simplicity)
// In production, use Redis or a database
const validSessions = new Map<string, { expires: number }>()

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now()
  validSessions.forEach((session, token) => {
    if (session.expires < now) {
      validSessions.delete(token)
    }
  })
}, 60 * 1000) // Every minute

export async function createSession(): Promise<string> {
  const token = generateSessionToken()
  const expires = Date.now() + SESSION_MAX_AGE * 1000

  validSessions.set(token, { expires })

  return token
}

export function validateSession(token: string): boolean {
  const session = validSessions.get(token)
  if (!session) return false
  if (session.expires < Date.now()) {
    validSessions.delete(token)
    return false
  }
  return true
}

export function invalidateSession(token: string): void {
  validSessions.delete(token)
}

export function verifyPassword(password: string): boolean {
  const correctPassword = process.env.APP_PASSWORD
  if (!correctPassword) {
    console.warn('APP_PASSWORD not set - authentication disabled')
    return true // Allow access if no password is set
  }
  return password === correctPassword
}

// Middleware helper to check authentication
export function isAuthenticated(request: NextRequest): boolean {
  // If no password is set, allow access
  if (!process.env.APP_PASSWORD) {
    return true
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
  if (!sessionCookie?.value) {
    return false
  }

  return validateSession(sessionCookie.value)
}

// Set session cookie
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

// Clear session cookie
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export { SESSION_COOKIE_NAME }
