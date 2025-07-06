'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface DashboardStats {
  totalImportacoes: number
  totalVendas: number
  totalClientes: number
  faturamentoMes: number
  crescimentoVendas: number
  pedidosPendentes: number
}

const mockStats: DashboardStats = {
  totalImportacoes: 1247,
  totalVendas: 8934,
  totalClientes: 423,
  faturamentoMes: 2847293.45,
  crescimentoVendas: 12.5,
  pedidosPendentes: 23
}

export default function DashboardOverview() {
  const { user } = useAuth()

  // Fetch real data from the API
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats()
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user, // Only fetch when user is authenticated
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const getUserName = () => {
    if (user?.first_name) {
      return user.first_name
    }
    return user?.email.split('@')[0] || 'Usuário'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {getGreeting()}, {getUserName()}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Aqui está um resumo das atividades da sua empresa hoje.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Importações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Importações
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.totalImportacoes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +20% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        {/* Total Vendas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vendas
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.totalVendas || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats?.crescimentoVendas || 0}% este mês
            </p>
          </CardContent>
        </Card>

        {/* Total Clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.totalClientes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12 novos este mês
            </p>
          </CardContent>
        </Card>

        {/* Faturamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faturamento (Mês)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.faturamentoMes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +8% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Nova importação #IMP-2025-001 criada
                </p>
                <p className="text-sm text-muted-foreground">
                  2 minutos atrás
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Pedido #PED-2025-0156 atualizado
                </p>
                <p className="text-sm text-muted-foreground">
                  15 minutos atrás
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Cliente Maria Silva cadastrado
                </p>
                <p className="text-sm text-muted-foreground">
                  1 hora atrás
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Relatório mensal gerado
                </p>
                <p className="text-sm text-muted-foreground">
                  3 horas atrás
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Nova Importação</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </button>
            
            <button className="w-full flex items-center justify-between p-3 text-left bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                <span className="font-medium">Novo Pedido</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </button>
            
            <button className="w-full flex items-center justify-between p-3 text-left bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Cadastrar Cliente</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </button>
            
            <button className="w-full flex items-center justify-between p-3 text-left bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <span className="font-medium">Ver Relatórios</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Performance</CardTitle>
          <CardDescription>
            Métricas importantes do sistema integrado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Pedidos Pendentes
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {stats?.pedidosPendentes || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Requer atenção
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Integrações Ativas
              </p>
              <p className="text-2xl font-bold text-green-600">
                18/18
              </p>
              <p className="text-xs text-muted-foreground">
                Sistemas conectados
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Última Sincronização
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {new Date().toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                Dados atualizados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}