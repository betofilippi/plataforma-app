'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import MovimentacaoForm from './MovimentacaoForm'
import { api } from '@/lib/api'
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react'

interface EstoqueItem {
  id: number
  produto_id: number
  produto_nome: string
  produto_codigo: string
  deposito_id: number
  deposito_nome: string
  quantidade_atual: number
  quantidade_reservada: number
  quantidade_disponivel: number
  custo_medio_ponderado: number
  valor_total_estoque: number
  ultima_movimentacao: string
  status_estoque: 'NORMAL' | 'BAIXO' | 'ZERADO' | 'NEGATIVO'
}

interface EstoqueFilters {
  search: string
  deposito_id: number | null
  status_estoque: string
  produto_categoria: string
}

export default function EstoqueList() {
  const [filters, setFilters] = useState<EstoqueFilters>({
    search: '',
    deposito_id: null,
    status_estoque: '',
    produto_categoria: ''
  })
  
  const [selectedProduto, setSelectedProduto] = useState<number | null>(null)
  const [showMovimentacaoForm, setShowMovimentacaoForm] = useState(false)
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // Query para lista de estoque
  const { 
    data: estoqueData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['estoque-list', filters, currentPage, itemsPerPage],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      })
      return api.get<{ 
        items: EstoqueItem[]; 
        pagination: { 
          total: number; 
          from: number; 
          to: number; 
          totalPages: number 
        } 
      }>(`/api/est/saldos?${params}`).then(res => res.data)
    }
  })

  // Query para depósitos (para filtro)
  const { data: depositos } = useQuery({
    queryKey: ['depositos'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/est/depositos').then(res => res.data)
  })

  // Query para categorias (para filtro)
  const { data: categorias } = useQuery({
    queryKey: ['produto-categorias'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/cad/products/categories').then(res => res.data)
  })

  const handleFilterChange = (key: keyof EstoqueFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleMovimentacao = (produtoId: number, tipo: 'ENTRADA' | 'SAIDA') => {
    setSelectedProduto(produtoId)
    setTipoMovimentacao(tipo)
    setShowMovimentacaoForm(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
      case 'BAIXO':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900'
      case 'ZERADO':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
      case 'NEGATIVO':
        return 'text-red-800 bg-red-200 dark:text-red-200 dark:bg-red-800'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return <Package className="w-4 h-4" />
      case 'BAIXO':
        return <AlertTriangle className="w-4 h-4" />
      case 'ZERADO':
      case 'NEGATIVO':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <h4 className="font-medium text-red-800">Erro ao carregar estoque</h4>
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
              <CardTitle>Consulta de Estoque</CardTitle>
              <CardDescription>
                Visualize saldos, quantidades e valores de estoque por produto
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
                  placeholder="Produto, código..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Status do Estoque
              </label>
              <select
                value={filters.status_estoque}
                onChange={(e) => handleFilterChange('status_estoque', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os status</option>
                <option value="NORMAL">Normal</option>
                <option value="BAIXO">Estoque Baixo</option>
                <option value="ZERADO">Estoque Zerado</option>
                <option value="NEGATIVO">Estoque Negativo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Categoria
              </label>
              <select
                value={filters.produto_categoria}
                onChange={(e) => handleFilterChange('produto_categoria', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas as categorias</option>
                {categorias?.map((categoria: any) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Lista de Estoque */}
          {!isLoading && estoqueData && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left p-3 font-medium">Produto</th>
                      <th className="text-left p-3 font-medium">Depósito</th>
                      <th className="text-right p-3 font-medium">Qtd. Atual</th>
                      <th className="text-right p-3 font-medium">Qtd. Reservada</th>
                      <th className="text-right p-3 font-medium">Qtd. Disponível</th>
                      <th className="text-right p-3 font-medium">Custo Médio</th>
                      <th className="text-right p-3 font-medium">Valor Total</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estoqueData.items?.map((item: EstoqueItem) => (
                      <tr key={`${item.produto_id}-${item.deposito_id}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">
                              {item.produto_nome}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.produto_codigo}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {item.deposito_nome}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm">
                            {item.quantidade_atual.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3 
                            })}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm text-yellow-600">
                            {item.quantidade_reservada.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3 
                            })}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm font-medium">
                            {item.quantidade_disponivel.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3 
                            })}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm">
                            R$ {item.custo_medio_ponderado.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4 
                            })}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm font-medium">
                            R$ {item.valor_total_estoque.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2 
                            })}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status_estoque)}`}>
                            {getStatusIcon(item.status_estoque)}
                            {item.status_estoque}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMovimentacao(item.produto_id, 'ENTRADA')}
                              title="Entrada de Estoque"
                            >
                              <TrendingUp className="w-3 h-3 text-green-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMovimentacao(item.produto_id, 'SAIDA')}
                              title="Saída de Estoque"
                            >
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Ver Detalhes"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {estoqueData.pagination && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {estoqueData.pagination.from} a {estoqueData.pagination.to} de {estoqueData.pagination.total} itens
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
                      Página {currentPage} de {estoqueData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= estoqueData.pagination.totalPages}
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
          {!isLoading && (!estoqueData?.items || estoqueData.items.length === 0) && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum item encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Não há produtos com estoque que correspondam aos filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Movimentação */}
      {showMovimentacaoForm && (
        <MovimentacaoForm
          isOpen={showMovimentacaoForm}
          onClose={() => {
            setShowMovimentacaoForm(false)
            setSelectedProduto(null)
          }}
          tipoDefault={tipoMovimentacao}
          produtoId={selectedProduto || undefined}
          onSuccess={() => {
            refetch()
          }}
        />
      )}
    </>
  )
}