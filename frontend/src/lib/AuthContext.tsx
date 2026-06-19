'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthUser, getToken, getUser, setAuth, clearAuth, isAuthenticated } from '@/lib/auth'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Hydrate auth state from localStorage on mount
    const storedToken = getToken()
    const storedUser = getUser()
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(storedUser)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (newToken: string, newUser: AuthUser) => {
    setAuth(newToken, newUser)
    setToken(newToken)
    setUser(newUser)
  }

  const handleLogout = () => {
    clearAuth()
    setToken(null)
    setUser(null)
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin'
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}