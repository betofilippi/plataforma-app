'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { api } from '@/lib/api'
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Package, 
  Calendar, 
  User,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  AlertTriangle
} from 'lucide-react'

interface MovimentacaoEstoque {
  id: number
  numero_documento: string
  tipo_movimentacao: string
  origem_movimentacao: string
  produto_id: number
  produto_nome: string
  produto_codigo: string
  lote_numero?: string
  deposito_origem_nome?: string
  deposito_destino_nome?: string
  quantidade: number
  custo_unitario: number
  custo_total: number
  preco_venda?: number
  indicador_cd: 'C' | 'D'
  documento_referencia_id?: number
  documento_referencia_tipo?: string
  observacoes?: string
  usuario_id: number
  usuario_nome: string
  data_movimentacao: string
  created_at: string
}

interface MovimentacaoFilters {
  search: string
  tipo_movimentacao: string
  origem_movimentacao: string
  produto_id: number | null
  deposito_id: number | null
  usuario_id: number | null
  data_inicio: string
  data_fim: string
  numero_documento: string
}

export default function MovimentacaoList() {
  const [filters, setFilters] = useState<MovimentacaoFilters>({
    search: '',
    tipo_movimentacao: '',
    origem_movimentacao: '',
    produto_id: null,
    deposito_id: null,
    usuario_id: null,
    data_inicio: '',
    data_fim: '',
    numero_documento: ''
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [showFilters, setShowFilters] = useState(false)

  // Query para lista de movimentações
  const { 
    data: movimentacoesData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['estoque-movimentacoes', filters, currentPage, itemsPerPage],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      })
      return api.get<{ 
        items: MovimentacaoEstoque[]; 
        pagination: { 
          total: number; 
          from: number; 
          to: number; 
          totalPages: number 
        } 
      }>(`/api/est/movimentacoes?${params}`).then(res => res.data)
    }
  })

  // Query para usuários (para filtro)
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/auth/users').then(res => res.data),
    enabled: showFilters
  })

  // Query para depósitos (para filtro)
  const { data: depositos } = useQuery({
    queryKey: ['depositos'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/est/depositos').then(res => res.data),
    enabled: showFilters
  })

  const handleFilterChange = (key: keyof MovimentacaoFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const getTipoIcon = (tipo: string, indicador: 'C' | 'D') => {
    if (tipo === 'TRANSFERENCIA') {
      return <ArrowRightLeft className="w-4 h-4 text-blue-500" />
    }
    
    if (indicador === 'C') {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    } else {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    }
  }

  const getTipoColor = (indicador: 'C' | 'D') => {
    return indicador === 'C' 
      ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
      : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
  }

  const formatTipo = (tipo: string) => {
    return tipo.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  const formatOrigem = (origem: string) => {
    return origem.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      tipo_movimentacao: '',
      origem_movimentacao: '',
      produto_id: null,
      deposito_id: null,
      usuario_id: null,
      data_inicio: '',
      data_fim: '',
      numero_documento: ''
    })
    setCurrentPage(1)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <h4 className="font-medium text-red-800">Erro ao carregar movimentações</h4>
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
            <CardTitle>Movimentações de Estoque</CardTitle>
            <CardDescription>
              Histórico completo de entradas, saídas e transferências
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
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
        {/* Filtros Básicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Produto, documento..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de Movimentação
            </label>
            <select
              value={filters.tipo_movimentacao}
              onChange={(e) => handleFilterChange('tipo_movimentacao', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Todos os tipos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
              <option value="TRANSFERENCIA">Transferência</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="INVENTARIO">Inventário</option>
              <option value="DEVOLUCAO">Devolução</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.data_inicio}
                onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                placeholder="Data início"
              />
              <Input
                type="date"
                value={filters.data_fim}
                onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                placeholder="Data fim"
              />
            </div>
          </div>
        </div>

        {/* Filtros Avançados */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">
                Origem da Movimentação
              </label>
              <select
                value={filters.origem_movimentacao}
                onChange={(e) => handleFilterChange('origem_movimentacao', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas as origens</option>
                <option value="COMPRA">Compra</option>
                <option value="VENDA">Venda</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="AJUSTE_MANUAL">Ajuste Manual</option>
                <option value="INVENTARIO">Inventário</option>
                <option value="DEVOLUCAO_CLIENTE">Devolução Cliente</option>
                <option value="DEVOLUCAO_FORNECEDOR">Devolução Fornecedor</option>
                <option value="PRODUCAO">Produção</option>
                <option value="CONSUMO_PRODUCAO">Consumo Produção</option>
                <option value="CORRECAO">Correção</option>
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Usuário
              </label>
              <select
                value={filters.usuario_id || ''}
                onChange={(e) => handleFilterChange('usuario_id', e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os usuários</option>
                {usuarios?.map((usuario: any) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.first_name} {usuario.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Número do Documento
              </label>
              <Input
                value={filters.numero_documento}
                onChange={(e) => handleFilterChange('numero_documento', e.target.value)}
                placeholder="Ex: NF-001234"
              />
            </div>

            <div className="lg:col-span-4 flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Lista de Movimentações */}
        {!isLoading && movimentacoesData && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Produto</th>
                    <th className="text-left p-3 font-medium">Origem/Destino</th>
                    <th className="text-right p-3 font-medium">Quantidade</th>
                    <th className="text-right p-3 font-medium">Custo Unit.</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Usuário</th>
                    <th className="text-left p-3 font-medium">Documento</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoesData.items?.map((movimento: MovimentacaoEstoque) => (
                    <tr key={movimento.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div className="text-sm">
                          {new Date(movimento.data_movimentacao).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(movimento.data_movimentacao).toLocaleTimeString('pt-BR')}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getTipoIcon(movimento.tipo_movimentacao, movimento.indicador_cd)}
                          <div>
                            <div className={`text-xs px-2 py-1 rounded-full font-medium ${getTipoColor(movimento.indicador_cd)}`}>
                              {formatTipo(movimento.tipo_movimentacao)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatOrigem(movimento.origem_movimentacao)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {movimento.produto_nome}
                        </div>
                        <div className="text-xs text-gray-500">
                          {movimento.produto_codigo}
                          {movimento.lote_numero && ` • Lote: ${movimento.lote_numero}`}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {movimento.tipo_movimentacao === 'TRANSFERENCIA' ? (
                            <>
                              <div className="text-red-600">De: {movimento.deposito_origem_nome || 'N/A'}</div>
                              <div className="text-green-600">Para: {movimento.deposito_destino_nome || 'N/A'}</div>
                            </>
                          ) : movimento.indicador_cd === 'C' ? (
                            <div className="text-green-600">
                              Entrada: {movimento.deposito_destino_nome || 'N/A'}
                            </div>
                          ) : (
                            <div className="text-red-600">
                              Saída: {movimento.deposito_origem_nome || 'N/A'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono text-sm font-medium ${
                          movimento.indicador_cd === 'C' 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {movimento.indicador_cd === 'C' ? '+' : '-'}{movimento.quantidade.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3 
                          })}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono text-sm">
                          R$ {movimento.custo_unitario.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4 
                          })}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono text-sm font-medium">
                          R$ {movimento.custo_total.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                          })}
                        </span>
                        {movimento.preco_venda && (
                          <div className="text-xs text-gray-500 font-mono">
                            Venda: R$ {movimento.preco_venda.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4 
                            })}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">
                            {movimento.usuario_nome}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {movimento.numero_documento ? (
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              {movimento.numero_documento}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        {movimento.documento_referencia_id && (
                          <div className="text-xs text-gray-500">
                            Ref: {movimento.documento_referencia_tipo} #{movimento.documento_referencia_id}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {movimentacoesData.pagination && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {movimentacoesData.pagination.from} a {movimentacoesData.pagination.to} de {movimentacoesData.pagination.total} movimentações
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
                    Página {currentPage} de {movimentacoesData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= movimentacoesData.pagination.totalPages}
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
        {!isLoading && (!movimentacoesData?.items || movimentacoesData.items.length === 0) && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma movimentação encontrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Não há movimentações que correspondam aos filtros aplicados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}