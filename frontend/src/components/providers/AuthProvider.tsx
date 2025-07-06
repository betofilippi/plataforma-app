'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'manager' | 'user' | 'viewer'
  status: 'active' | 'inactive' | 'suspended'
  avatar_url?: string
  created_at: string
  last_login_at?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Check for existing session on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const userData = await response.json()
        if (userData.data) {
          setUser(userData.data)
        }
      } else {
        // Token is invalid or expired
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Erro ao fazer login')
      }

      // Store tokens
      localStorage.setItem('auth_token', response.data.access_token)
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token)
      }

      // Set user data
      setUser(response.data.user)

      toast.success('Login realizado com sucesso!')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Attempt to logout from server
      await authApi.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
      // Continue with local logout even if API call fails
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      router.push('/')
      toast.success('Logout realizado com sucesso!')
    }
  }

  const refreshUser = async () => {
    await checkAuth()
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    refreshUser,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}