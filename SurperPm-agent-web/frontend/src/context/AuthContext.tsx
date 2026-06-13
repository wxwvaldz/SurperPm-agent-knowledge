import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, User } from '@/api/client'

interface AuthState {
  user: User | null
  loading: boolean
  refresh: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    api.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(refresh, [refresh])

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {})
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
