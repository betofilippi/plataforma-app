'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { api } from '@/lib/api'
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye,
  EyeOff,
  Clock,
  Package,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'

interface AlertaEstoque {
  id: number
  produto_id: number
  produto_nome: string
  produto_codigo: string
  deposito_id: number
  deposito_nome: string
  tipo_alerta: string
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  mensagem: string
  detalhes: any
  estoque_atual: number
  estoque_minimo: number
  status: 'PENDENTE' | 'VISUALIZADO' | 'RESOLVIDO' | 'IGNORADO'
  data_alerta: string
  data_resolucao?: string
  resolvido_por?: number
  observacoes_resolucao?: string
}

interface AlertaFilters {
  status: string
  criticidade: string
  tipo_alerta: string
  produto_id: number | null
  deposito_id: number | null
}

export default function AlertasEstoque() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<AlertaFilters>({
    status: '',
    criticidade: '',
    tipo_alerta: '',
    produto_id: null,
    deposito_id: null
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // Query para lista de alertas
  const { 
    data: alertasData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['estoque-alertas', filters, currentPage, itemsPerPage],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      })
      return api.get<{ alertas: AlertaEstoque[]; total: number; page: number; totalPages: number }>(`/api/est/alertas?${params}`).then(res => res.data)
    }
  })

  // Query para depósitos (para filtro)
  const { data: depositos } = useQuery({
    queryKey: ['depositos'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/est/depositos').then(res => res.data)
  })

  // Mutation para atualizar status do alerta
  const updateAlertaMutation = useMutation({
    mutationFn: ({ id, status, observacoes }: { id: number, status: string, observacoes?: string }) =>
      api.patch(`/api/est/alertas/${id}`, { status, observacoes_resolucao: observacoes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-alertas'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-metrics'] })
    }
  })

  const handleFilterChange = (key: keyof AlertaFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleUpdateStatus = (id: number, status: string, observacoes?: string) => {
    updateAlertaMutation.mutate({ id, status, observacoes })
  }

  const getCriticidadeColor = (criticidade: string) => {
    switch (criticidade) {
      case 'CRITICA':
        return 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900'
      case 'ALTA':
        return 'text-orange-800 bg-orange-100 dark:text-orange-200 dark:bg-orange-900'
      case 'MEDIA':
        return 'text-yellow-800 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900'
      case 'BAIXA':
        return 'text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900'
      default:
        return 'text-gray-800 bg-gray-100 dark:text-gray-200 dark:bg-gray-900'
    }
  }

  const getCriticidadeIcon = (criticidade: string) => {
    switch (criticidade) {
      case 'CRITICA':
      case 'ALTA':
        return <AlertTriangle className="w-4 h-4" />
      case 'MEDIA':
        return <Clock className="w-4 h-4" />
      case 'BAIXA':
        return <Package className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
      case 'VISUALIZADO':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900'
      case 'RESOLVIDO':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
      case 'IGNORADO':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <AlertTriangle className="w-4 h-4" />
      case 'VISUALIZADO':
        return <Eye className="w-4 h-4" />
      case 'RESOLVIDO':
        return <CheckCircle className="w-4 h-4" />
      case 'IGNORADO':
        return <EyeOff className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const formatTipoAlerta = (tipo: string) => {
    return tipo.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <h4 className="font-medium text-red-800">Erro ao carregar alertas</h4>
              <p className="text-sm text-red-600">
                {error.message || 'Erro interno do servidor'}
              </p>
            </div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Alertas de Estoque</CardTitle>
            <CardDescription>
              Monitore produtos com estoque baixo, zerado ou outros problemas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="VISUALIZADO">Visualizado</option>
              <option value="RESOLVIDO">Resolvido</option>
              <option value="IGNORADO">Ignorado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Criticidade
            </label>
            <select
              value={filters.criticidade}
              onChange={(e) => handleFilterChange('criticidade', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Todas as criticidades</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de Alerta
            </label>
            <select
              value={filters.tipo_alerta}
              onChange={(e) => handleFilterChange('tipo_alerta', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Todos os tipos</option>
              <option value="ESTOQUE_MINIMO">Estoque Mínimo</option>
              <option value="ESTOQUE_ZERADO">Estoque Zerado</option>
              <option value="ESTOQUE_NEGATIVO">Estoque Negativo</option>
              <option value="VALIDADE_PROXIMA">Validade Próxima</option>
              <option value="LOTE_VENCIDO">Lote Vencido</option>
              <option value="DIVERGENCIA_INVENTARIO">Divergência Inventário</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Depósito
            </label>
            <select
              value={filters.deposito_id || ''}
              onChange={(e) => handleFilterChange('deposito_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Todos os depósitos</option>
              {depositos?.map((deposito: any) => (
                <option key={deposito.id} value={deposito.id}>
                  {deposito.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  status: '',
                  criticidade: '',
                  tipo_alerta: '',
                  produto_id: null,
                  deposito_id: null
                })
                setCurrentPage(1)
              }}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Lista de Alertas */}
        {!isLoading && alertasData && (
          <>
            <div className="space-y-4">
              {alertasData.alertas?.map((alerta: AlertaEstoque) => (
                <Card key={alerta.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Informações do Alerta */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${getCriticidadeColor(alerta.criticidade)}`}>
                            {getCriticidadeIcon(alerta.criticidade)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">
                                {formatTipoAlerta(alerta.tipo_alerta)}
                              </h4>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCriticidadeColor(alerta.criticidade)}`}>
                                {alerta.criticidade}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {alerta.mensagem}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {alerta.produto_codigo} - {alerta.produto_nome}
                              </span>
                              <span>
                                {alerta.deposito_nome}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(alerta.data_alerta).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quantidades */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">Quantidades</div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Atual:</span>
                            <span className="font-mono">{alerta.estoque_atual}</span>
                          </div>
                          {alerta.estoque_minimo && (
                            <div className="flex justify-between text-sm">
                              <span>Mínimo:</span>
                              <span className="font-mono">{alerta.estoque_minimo}</span>
                            </div>
                          )}
                          {alerta.detalhes && (
                            <div className="text-xs text-gray-500">
                              {JSON.stringify(alerta.detalhes)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status e Ações */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alerta.status)}`}>
                            {getStatusIcon(alerta.status)}
                            {alerta.status}
                          </span>
                        </div>

                        {alerta.status === 'PENDENTE' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(alerta.id, 'VISUALIZADO')}
                              disabled={updateAlertaMutation.isPending}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Visualizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(alerta.id, 'RESOLVIDO')}
                              disabled={updateAlertaMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(alerta.id, 'IGNORADO')}
                              disabled={updateAlertaMutation.isPending}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Ignorar
                            </Button>
                          </div>
                        )}

                        {alerta.status === 'VISUALIZADO' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(alerta.id, 'RESOLVIDO')}
                              disabled={updateAlertaMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolver
                            </Button>
                          </div>
                        )}

                        {(alerta.status === 'RESOLVIDO' || alerta.status === 'IGNORADO') && alerta.data_resolucao && (
                          <div className="text-xs text-gray-500">
                            {alerta.status === 'RESOLVIDO' ? 'Resolvido' : 'Ignorado'} em{' '}
                            {new Date(alerta.data_resolucao).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paginação */}
            {alertasData.total > 0 && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando página {alertasData.page} de {alertasData.total} alertas
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Página {currentPage} de {alertasData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= alertasData.totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && (!alertasData?.alertas || alertasData.alertas.length === 0) && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhum alerta encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {Object.values(filters).some(v => v !== '' && v !== null)
                ? 'Não há alertas que correspondam aos filtros aplicados.'
                : 'Não há alertas pendentes no momento. Tudo está funcionando bem!'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}