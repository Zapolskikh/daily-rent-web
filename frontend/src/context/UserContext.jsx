import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getUserProfile } from '../lib/api'

const UserContext = createContext(null)
const STORAGE_KEY = 'rent_prague_user_token'

export function UserProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return }
    setLoading(true)
    getUserProfile(token)
      .then(setUser)
      .catch(() => { localStorage.removeItem(STORAGE_KEY); setToken(null); setUser(null) })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback((accessToken, userData) => {
    localStorage.setItem(STORAGE_KEY, accessToken)
    setToken(accessToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <UserContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
