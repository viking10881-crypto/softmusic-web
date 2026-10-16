import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, ApiError, getToken, setToken, type User } from '@/lib/api'

interface AuthContextValue {
  user: User | null
  /** true mientras validamos un token guardado al abrir la app. */
  checking: boolean
  login(email: string, password: string): Promise<void>
  register(username: string, email: string, password: string): Promise<void>
  logout(): void
  authOpen: boolean
  setAuthOpen(open: boolean): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => Boolean(getToken()))
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!getToken()) return
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(error => {
        if (error instanceof ApiError && error.status === 401) setToken(null)
      })
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login(email, password)
    setToken(token)
    setUser(user)
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const { token, user } = await api.register(username, email, password)
    setToken(token)
    setUser(user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, checking, login, register, logout, authOpen, setAuthOpen }),
    [user, checking, login, register, logout, authOpen],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
