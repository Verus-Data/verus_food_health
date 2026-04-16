/**
 * Client-side JWT authentication for static export + CGI backend.
 * Replaces NextAuth (which requires server-side rendering).
 */

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
}

const TOKEN_KEY = 'gut_health_token'
const USER_KEY = 'gut_health_user'

/** Get the stored JWT token */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/** Get the stored user object */
export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

/** Store auth data after login/register */
export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/** Clear auth data on logout */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** Check if user is currently authenticated */
export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser()
}

/** Build Authorization header object for fetch/axios calls */
export function authHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/** Logout — clear storage and redirect to signin */
export function logout(): void {
  clearAuth()
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/signin'
  }
}