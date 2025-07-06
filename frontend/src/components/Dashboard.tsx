'use client'

import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import LoginForm from '@/components/auth/LoginForm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardOverview from '@/components/dashboard/DashboardOverview'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Plataforma ERP NXT
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Sistema de Gestão Empresarial Integrada
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  )
}