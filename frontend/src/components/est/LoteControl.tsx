'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { api } from '@/lib/api'
import { 
  Package, 
  Calendar, 
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Plus,
  CheckCircle,
  X
} from 'lucide-react'

interface Lote {
  id: number
  numero_lote: string
  produto_id: number
  produto_nome: string
  produto_codigo: string
  data_fabricacao: string
  data_validade: string
  quantidade_inicial: number
  quantidade_atual: number
  quantidade_reservada: number
  quantidade_disponivel: number
  custo_unitario: number
  valor_total: number
  fornecedor_nome?: string
  numero_documento?: string
  status: 'ATIVO' | 'VENCIDO' | 'BLOQUEADO' | 'CONSUMIDO'
  dias_vencimento: number
  created_at: string
}

interface LoteFilters {
  search: string
  produto_id: number | null
  status: string
  data_vencimento_inicio: string
  data_vencimento_fim: string
  fornecedor_id: number | null
  vencimento_proximo: boolean
}

export default function LoteControl() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<LoteFilters>({
    search: '',
    produto_id: null,
    status: '',
    data_vencimento_inicio: '',
    data_vencimento_fim: '',
    fornecedor_id: null,
    vencimento_proximo: false
  })
  
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [showLoteDetails, setShowLoteDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // Query para lista de lotes
  const { 
    data: lotesData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['lotes', filters, currentPage, itemsPerPage],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== false)
        )
      })
      return api.get<{ 
        items: Lote[]; 
        pagination: { 
          total: number; 
          from: number; 
          to: number; 
          totalPages: number 
        } 
      }>(`/api/est/lotes?${params}`).then(res => res.data)
    }
  })

  // Query para produtos (para filtro)
  const { data: produtos } = useQuery({
    queryKey: ['produtos-lotes'],
    queryFn: () => api.get<{ id: number; codigo: string; nome: string }[]>('/api/cad/products').then(res => res.data)
  })

  // Query para fornecedores (para filtro)
  const { data: fornecedores } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/cad/suppliers').then(res => res.data)
  })

  // Mutation para bloquear/desbloquear lote
  const updateLoteStatus = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) =>
      api.patch(`/api/est/lotes/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-metrics'] })
    }
  })

  const handleFilterChange = (key: keyof LoteFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      produto_id: null,
      status: '',
      data_vencimento_inicio: '',
      data_vencimento_fim: '',
      fornecedor_id: null,
      vencimento_proximo: false
    })
    setCurrentPage(1)
  }

  const getStatusColor = (status: string, diasVencimento: number) => {
    if (status === 'VENCIDO') {
      return 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900'
    }
    if (status === 'BLOQUEADO') {
      return 'text-gray-800 bg-gray-100 dark:text-gray-200 dark:bg-gray-900'
    }
    if (status === 'CONSUMIDO') {
      return 'text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900'
    }
    if (diasVencimento <= 7) {
      return 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900'
    }
    if (diasVencimento <= 30) {
      return 'text-yellow-800 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900'
    }
    return 'text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900'
  }

  const getStatusIcon = (status: string, diasVencimento: number) => {
    if (status === 'VENCIDO' || diasVencimento <= 7) {
      return <AlertTriangle className="w-4 h-4" />
    }
    if (status === 'BLOQUEADO') {
      return <X className="w-4 h-4" />
    }
    if (status === 'CONSUMIDO') {
      return <CheckCircle className="w-4 h-4" />
    }
    return <Package className="w-4 h-4" />
  }

  const formatStatus = (status: string) => {
    const statusMap = {
      'ATIVO': 'Ativo',
      'VENCIDO': 'Vencido',
      'BLOQUEADO': 'Bloqueado',
      'CONSUMIDO': 'Consumido'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <h4 className="font-medium text-red-800">Erro ao carregar lotes</h4>
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
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Controle de Lotes</CardTitle>
              <CardDescription>
                Gerencie lotes, validades e rastreabilidade de produtos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleFilterChange('vencimento_proximo', !filters.vencimento_proximo)}
                className={filters.vencimento_proximo ? 'bg-yellow-100 border-yellow-300' : ''}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Venc. Próximo
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Lote, produto..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Produto
              </label>
              <select
                value={filters.produto_id || ''}
                onChange={(e) => handleFilterChange('produto_id', e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os produtos</option>
                {produtos?.map((produto: any) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.codigo} - {produto.nome}
                  </option>
                ))}
              </select>
            </div>

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
                <option value="ATIVO">Ativo</option>
                <option value="VENCIDO">Vencido</option>
                <option value="BLOQUEADO">Bloqueado</option>
                <option value="CONSUMIDO">Consumido</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Fornecedor
              </label>
              <select
                value={filters.fornecedor_id || ''}
                onChange={(e) => handleFilterChange('fornecedor_id', e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os fornecedores</option>
                {fornecedores?.map((fornecedor: any) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtros de Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Vencimento - Data Início
              </label>
              <Input
                type="date"
                value={filters.data_vencimento_inicio}
                onChange={(e) => handleFilterChange('data_vencimento_inicio', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Vencimento - Data Fim
              </label>
              <Input
                type="date"
                value={filters.data_vencimento_fim}
                onChange={(e) => handleFilterChange('data_vencimento_fim', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Lista de Lotes */}
          {!isLoading && lotesData && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left p-3 font-medium">Lote</th>
                      <th className="text-left p-3 font-medium">Produto</th>
                      <th className="text-center p-3 font-medium">Fabricação</th>
                      <th className="text-center p-3 font-medium">Validade</th>
                      <th className="text-right p-3 font-medium">Qtd. Atual</th>
                      <th className="text-right p-3 font-medium">Qtd. Disponível</th>
                      <th className="text-right p-3 font-medium">Valor Total</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesData.items?.map((lote: Lote) => (
                      <tr key={lote.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">
                              {lote.numero_lote}
                            </div>
                            {lote.numero_documento && (
                              <div className="text-xs text-gray-500">
                                Doc: {lote.numero_documento}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">
                              {lote.produto_nome}
                            </div>
                            <div className="text-xs text-gray-500">
                              {lote.produto_codigo}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-sm">
                            {new Date(lote.data_fabricacao).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div>
                            <span className="text-sm">
                              {new Date(lote.data_validade).toLocaleDateString('pt-BR')}
                            </span>
                            <div className={`text-xs ${
                              lote.dias_vencimento <= 7 ? 'text-red-600 font-medium' :
                              lote.dias_vencimento <= 30 ? 'text-yellow-600' : 'text-gray-500'
                            }`}>
                              {lote.dias_vencimento > 0 
                                ? `${lote.dias_vencimento} dias`
                                : `Vencido há ${Math.abs(lote.dias_vencimento)} dias`
                              }
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm">
                            {lote.quantidade_atual.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3 
                            })}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm font-medium">
                            {lote.quantidade_disponivel.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3 
                            })}
                          </span>
                          {lote.quantidade_reservada > 0 && (
                            <div className="text-xs text-yellow-600">
                              Reserv: {lote.quantidade_reservada.toFixed(3)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm font-medium">
                            R$ {lote.valor_total.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2 
                            })}
                          </span>
                          <div className="text-xs text-gray-500 font-mono">
                            Unit: R$ {lote.custo_unitario.toFixed(4)}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lote.status, lote.dias_vencimento)}`}>
                            {getStatusIcon(lote.status, lote.dias_vencimento)}
                            {formatStatus(lote.status)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLote(lote)
                                setShowLoteDetails(true)
                              }}
                              title="Ver Detalhes"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            
                            {lote.status === 'ATIVO' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateLoteStatus.mutate({ id: lote.id, status: 'BLOQUEADO' })}
                                disabled={updateLoteStatus.isPending}
                                title="Bloquear Lote"
                              >
                                <X className="w-3 h-3 text-red-500" />
                              </Button>
                            )}
                            
                            {lote.status === 'BLOQUEADO' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateLoteStatus.mutate({ id: lote.id, status: 'ATIVO' })}
                                disabled={updateLoteStatus.isPending}
                                title="Desbloquear Lote"
                              >
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {lotesData.pagination && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {lotesData.pagination.from} a {lotesData.pagination.to} de {lotesData.pagination.total} lotes
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
                      Página {currentPage} de {lotesData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= lotesData.pagination.totalPages}
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
          {!isLoading && (!lotesData?.items || lotesData.items.length === 0) && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum lote encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Não há lotes que correspondam aos filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Lote */}
      {showLoteDetails && selectedLote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detalhes do Lote {selectedLote.numero_lote}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoteDetails(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Produto
                  </label>
                  <p className="font-medium">{selectedLote.produto_nome}</p>
                  <p className="text-sm text-gray-500">{selectedLote.produto_codigo}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLote.status, selectedLote.dias_vencimento)}`}>
                      {getStatusIcon(selectedLote.status, selectedLote.dias_vencimento)}
                      {formatStatus(selectedLote.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Data de Fabricação
                  </label>
                  <p>{new Date(selectedLote.data_fabricacao).toLocaleDateString('pt-BR')}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Data de Validade
                  </label>
                  <p>{new Date(selectedLote.data_validade).toLocaleDateString('pt-BR')}</p>
                  <p className={`text-sm ${
                    selectedLote.dias_vencimento <= 7 ? 'text-red-600 font-medium' :
                    selectedLote.dias_vencimento <= 30 ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    {selectedLote.dias_vencimento > 0 
                      ? `${selectedLote.dias_vencimento} dias para vencer`
                      : `Vencido há ${Math.abs(selectedLote.dias_vencimento)} dias`
                    }
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Quantidade Inicial
                  </label>
                  <p className="font-mono">{selectedLote.quantidade_inicial.toFixed(3)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Quantidade Atual
                  </label>
                  <p className="font-mono font-medium">{selectedLote.quantidade_atual.toFixed(3)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Quantidade Reservada
                  </label>
                  <p className="font-mono text-yellow-600">{selectedLote.quantidade_reservada.toFixed(3)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Quantidade Disponível
                  </label>
                  <p className="font-mono font-medium text-green-600">{selectedLote.quantidade_disponivel.toFixed(3)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Custo Unitário
                  </label>
                  <p className="font-mono">R$ {selectedLote.custo_unitario.toFixed(4)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Valor Total
                  </label>
                  <p className="font-mono font-medium">R$ {selectedLote.valor_total.toFixed(2)}</p>
                </div>

                {selectedLote.fornecedor_nome && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Fornecedor
                    </label>
                    <p>{selectedLote.fornecedor_nome}</p>
                  </div>
                )}

                {selectedLote.numero_documento && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Documento
                    </label>
                    <p>{selectedLote.numero_documento}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Data de Criação
                </label>
                <p>{new Date(selectedLote.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}