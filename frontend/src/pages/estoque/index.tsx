'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { api } from '@/lib/api'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Archive,
  BarChart3,
  FileText,
  Settings
} from 'lucide-react'

interface EstoqueMetrics {
  totalProdutos: number
  valorTotalEstoque: number
  produtosEstoqueMinimo: number
  produtosEstoqueZerado: number
  movimentacoesHoje: number
  alertasPendentes: number
}

interface RecentMovimento {
  id: number
  produto_nome: string
  tipo_movimentacao: string
  quantidade: number
  data_movimentacao: string
  usuario_nome: string
}

interface AlertaEstoque {
  id: number
  tipo_alerta: string
  criticidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'
  mensagem: string
  produto_id: number
  produto_nome?: string
  data_criacao: string
  status: string
}

export default function EstoquePage() {
  const [selectedPeriod, setSelectedPeriod] = useState('7days')

  // Query para métricas de estoque
  const { data: metrics, isLoading: metricsLoading } = useQuery<EstoqueMetrics>({
    queryKey: ['estoque-metrics', selectedPeriod],
    queryFn: async () => {
      const response = await api.get<EstoqueMetrics>(`/api/est/metrics?period=${selectedPeriod}`)
      if (!response.data) {
        throw new Error('Failed to fetch metrics data')
      }
      return response.data
    }
  })

  // Query para movimentações recentes
  const { data: recentMovimentos, isLoading: movimentosLoading } = useQuery<RecentMovimento[]>({
    queryKey: ['estoque-movimentos-recentes'],
    queryFn: async () => {
      const response = await api.get<RecentMovimento[]>('/api/est/movimentacoes/recentes?limit=10')
      if (!response.data) {
        throw new Error('Failed to fetch recent movements data')
      }
      return response.data
    }
  })

  // Query para alertas
  const { data: alertas, isLoading: alertasLoading } = useQuery<AlertaEstoque[]>({
    queryKey: ['estoque-alertas'],
    queryFn: async () => {
      const response = await api.get<AlertaEstoque[]>('/api/est/alertas?status=PENDENTE&limit=5')
      if (!response.data) {
        throw new Error('Failed to fetch alerts data')
      }
      return response.data
    }
  })

  if (metricsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Controle de Estoque
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Gerencie entradas, saídas e movimentações de estoque
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.totalProdutos || 0}
                </span>
                <Package className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {(metrics?.valorTotalEstoque || 0).toLocaleString('pt-BR')}
                </span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Estoque Mínimo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {metrics?.produtosEstoqueMinimo || 0}
                </span>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Estoque Zerado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {metrics?.produtosEstoqueZerado || 0}
                </span>
                <Archive className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Movimentações Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.movimentacoesHoje || 0}
                </span>
                <TrendingDown className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Alertas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {metrics?.alertasPendentes || 0}
                </span>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu de ações rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Entrada de Estoque
              </CardTitle>
              <CardDescription>
                Registrar entradas de produtos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Saída de Estoque
              </CardTitle>
              <CardDescription>
                Registrar saídas de produtos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-500" />
                Consulta de Saldos
              </CardTitle>
              <CardDescription>
                Verificar saldos por produto
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Inventário
              </CardTitle>
              <CardDescription>
                Realizar contagem de estoque
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Grid com movimentações recentes e alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Movimentações Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Recentes</CardTitle>
              <CardDescription>
                Últimas entradas e saídas de estoque
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movimentosLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMovimentos?.slice(0, 5).map((movimento) => (
                    <div 
                      key={movimento.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {movimento.tipo_movimentacao === 'ENTRADA' ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {movimento.produto_nome}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {movimento.usuario_nome} • {new Date(movimento.data_movimentacao).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        movimento.tipo_movimentacao === 'ENTRADA' 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {movimento.tipo_movimentacao === 'ENTRADA' ? '+' : '-'}{movimento.quantidade}
                      </span>
                    </div>
                  ))}
                  {(!recentMovimentos || recentMovimentos.length === 0) && (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Nenhuma movimentação recente
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alertas Pendentes */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas Pendentes</CardTitle>
              <CardDescription>
                Produtos que requerem atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertasLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-3">
                  {alertas?.slice(0, 5).map((alerta: AlertaEstoque) => (
                    <div 
                      key={alerta.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <AlertTriangle className={`w-4 h-4 ${
                        alerta.criticidade === 'CRITICA' 
                          ? 'text-red-500'
                          : alerta.criticidade === 'ALTA'
                          ? 'text-orange-500'
                          : 'text-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {alerta.tipo_alerta.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {alerta.mensagem}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alerta.criticidade === 'CRITICA'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : alerta.criticidade === 'ALTA'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {alerta.criticidade}
                      </span>
                    </div>
                  ))}
                  {(!alertas || alertas.length === 0) && (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Nenhum alerta pendente
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}