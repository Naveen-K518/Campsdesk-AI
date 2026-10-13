import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, AdminUser } from '@/lib/api'

interface AuthContextType {
  user: AdminUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, pass: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'campusdesk_admin_token'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const res = await api.getMe()
        if (res.user && res.user.role === 'admin') {
          setUser(res.user)
          setToken(storedToken)
        } else {
          // Non-admin token found in storage
          localStorage.removeItem(TOKEN_KEY)
          setUser(null)
          setToken(null)
        }
      } catch (err) {
        console.warn('Session verification failed:', err)
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass)

    // Strict role check: Only admin is permitted
    if (res.user.role !== 'admin') {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
      const roleCapitalized = res.user.role.charAt(0).toUpperCase() + res.user.role.slice(1)
      throw new Error(
        `Access Denied: You are signed in as a ${roleCapitalized}. This administrative portal is strictly restricted to System Administrators. Mentors and Students must use the CampusDesk mobile application.`
      )
    }

    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
  }

  const loginWithGoogle = async (idToken: string) => {
    const res = await api.loginWithGoogle(idToken)

    // Strict role check: Only admin is permitted
    if (res.user.role !== 'admin') {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
      throw new Error('This account does not have admin access')
    }

    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && user.role === 'admin',
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
