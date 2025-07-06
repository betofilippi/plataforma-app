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
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Package, 
  Calendar, 
  FileText,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  DollarSign,
  AlertTriangle
} from 'lucide-react'

interface RelatorioFiltros {
  data_inicio: string
  data_fim: string
  deposito_id: number | null
  categoria_id: number | null
  fornecedor_id: number | null
  tipo_relatorio: string
}

interface EstoqueValor {
  categoria: string
  quantidade_total: number
  valor_total: number
  percentual: number
}

interface MovimentacaoResumo {
  tipo_movimentacao: string
  quantidade_total: number
  valor_total: number
  numero_movimentacoes: number
}

interface ProdutoRanking {
  produto_id: number
  produto_nome: string
  produto_codigo: string
  quantidade_movimentada: number
  valor_movimentado: number
  numero_movimentacoes: number
  tipo_analise: 'ENTRADA' | 'SAIDA'
}

interface AlertasSummary {
  total_alertas: number
  alertas_por_criticidade: {
    CRITICA: number
    ALTA: number
    MEDIA: number
    BAIXA: number
  }
  alertas_por_tipo: Array<{
    tipo: string
    quantidade: number
  }>
}

export default function RelatoriosEstoque() {
  const [filtros, setFiltros] = useState<RelatorioFiltros>({
    data_inicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    deposito_id: null,
    categoria_id: null,
    fornecedor_id: null,
    tipo_relatorio: 'MOVIMENTACOES'
  })

  const [selectedPeriodo, setSelectedPeriodo] = useState('30dias')

  // Queries para dados dos filtros
  const { data: depositos } = useQuery({
    queryKey: ['depositos'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/est/depositos').then(res => res.data)
  })

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/cad/products/categories').then(res => res.data)
  })

  const { data: fornecedores } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/cad/suppliers').then(res => res.data)
  })

  // Queries para dados dos relatórios
  const { data: estoqueValor, isLoading: loadingEstoque } = useQuery({
    queryKey: ['relatorio-estoque-valor', filtros],
    queryFn: () => {
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value !== null && value !== '')
        )
      })
      return api.get<{ categorias: EstoqueValor[] }>(`/api/est/relatorios/estoque-valor?${params}`).then(res => res.data)
    },
    enabled: filtros.tipo_relatorio === 'ESTOQUE_VALOR'
  })

  const { data: movimentacoes, isLoading: loadingMovimentacoes } = useQuery({
    queryKey: ['relatorio-movimentacoes', filtros],
    queryFn: () => {
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value !== null && value !== '')
        )
      })
      return api.get<{ resumo: MovimentacaoResumo[] }>(`/api/est/relatorios/movimentacoes?${params}`).then(res => res.data)
    },
    enabled: filtros.tipo_relatorio === 'MOVIMENTACOES'
  })

  const { data: rankingProdutos, isLoading: loadingRanking } = useQuery({
    queryKey: ['relatorio-ranking', filtros],
    queryFn: () => {
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value !== null && value !== '')
        )
      })
      return api.get<{ produtos: ProdutoRanking[] }>(`/api/est/relatorios/ranking-produtos?${params}`).then(res => res.data)
    },
    enabled: filtros.tipo_relatorio === 'RANKING_PRODUTOS'
  })

  const { data: alertasSummary, isLoading: loadingAlertas } = useQuery({
    queryKey: ['relatorio-alertas', filtros],
    queryFn: () => {
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value !== null && value !== '')
        )
      })
      return api.get<AlertasSummary>(`/api/est/relatorios/alertas?${params}`).then(res => res.data)
    },
    enabled: filtros.tipo_relatorio === 'ALERTAS'
  })

  const handleFiltroChange = (key: keyof RelatorioFiltros, value: any) => {
    setFiltros(prev => ({ ...prev, [key]: value }))
  }

  const handlePeriodoChange = (periodo: string) => {
    setSelectedPeriodo(periodo)
    const hoje = new Date()
    let dataInicio: Date

    switch (periodo) {
      case '7dias':
        dataInicio = new Date(hoje.setDate(hoje.getDate() - 7))
        break
      case '30dias':
        dataInicio = new Date(hoje.setDate(hoje.getDate() - 30))
        break
      case '90dias':
        dataInicio = new Date(hoje.setDate(hoje.getDate() - 90))
        break
      case '12meses':
        dataInicio = new Date(hoje.setFullYear(hoje.getFullYear() - 1))
        break
      default:
        return
    }

    setFiltros(prev => ({
      ...prev,
      data_inicio: dataInicio.toISOString().split('T')[0],
      data_fim: new Date().toISOString().split('T')[0]
    }))
  }

  const exportarRelatorio = (formato: 'PDF' | 'EXCEL' | 'CSV') => {
    const params = new URLSearchParams({
      formato,
      ...Object.fromEntries(
        Object.entries(filtros).filter(([_, value]) => value !== null && value !== '')
      )
    })
    
    const url = `/api/est/relatorios/export?${params}`
    window.open(url, '_blank')
  }

  const isLoading = loadingEstoque || loadingMovimentacoes || loadingRanking || loadingAlertas

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Relatórios de Estoque</CardTitle>
              <CardDescription>
                Análises detalhadas de movimentações, valores e performance de estoque
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportarRelatorio('PDF')}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => exportarRelatorio('EXCEL')}>
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={() => exportarRelatorio('CSV')}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de Relatório
              </label>
              <select
                value={filtros.tipo_relatorio}
                onChange={(e) => handleFiltroChange('tipo_relatorio', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="MOVIMENTACOES">Movimentações</option>
                <option value="ESTOQUE_VALOR">Estoque por Valor</option>
                <option value="RANKING_PRODUTOS">Ranking de Produtos</option>
                <option value="ALERTAS">Relatório de Alertas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Período Rápido
              </label>
              <select
                value={selectedPeriodo}
                onChange={(e) => handlePeriodoChange(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="90dias">Últimos 90 dias</option>
                <option value="12meses">Últimos 12 meses</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Depósito
              </label>
              <select
                value={filtros.deposito_id || ''}
                onChange={(e) => handleFiltroChange('deposito_id', e.target.value ? Number(e.target.value) : null)}
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
          </div>

          {/* Filtros de Data Personalizada */}
          {selectedPeriodo === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Data Início
                </label>
                <Input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => handleFiltroChange('data_inicio', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Data Fim
                </label>
                <Input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => handleFiltroChange('data_fim', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Filtros Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Categoria
              </label>
              <select
                value={filtros.categoria_id || ''}
                onChange={(e) => handleFiltroChange('categoria_id', e.target.value ? Number(e.target.value) : null)}
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Fornecedor
              </label>
              <select
                value={filtros.fornecedor_id || ''}
                onChange={(e) => handleFiltroChange('fornecedor_id', e.target.value ? Number(e.target.value) : null)}
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
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Relatório de Movimentações */}
      {filtros.tipo_relatorio === 'MOVIMENTACOES' && movimentacoes && !loadingMovimentacoes && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Resumo de Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movimentacoes.resumo?.map((item: MovimentacaoResumo) => (
                  <div key={item.tipo_movimentacao} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium">{item.tipo_movimentacao}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.numero_movimentacoes} movimentações
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{item.quantidade_total.toFixed(3)}</p>
                      <p className="font-mono text-sm font-medium">R$ {item.valor_total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimentações por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Gráfico de movimentações por período
                <br />
                <small>(Implementar com biblioteca de gráficos)</small>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Relatório de Estoque por Valor */}
      {filtros.tipo_relatorio === 'ESTOQUE_VALOR' && estoqueValor && !loadingEstoque && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Estoque por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {estoqueValor.categorias?.map((item: EstoqueValor) => (
                  <div key={item.categoria} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.categoria}</span>
                      <span className="text-sm text-gray-600">{item.percentual.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.percentual}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{item.quantidade_total.toFixed(3)} unidades</span>
                      <span>R$ {item.valor_total.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Valor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Gráfico de pizza com distribuição de valor
                <br />
                <small>(Implementar com biblioteca de gráficos)</small>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking de Produtos */}
      {filtros.tipo_relatorio === 'RANKING_PRODUTOS' && rankingProdutos && !loadingRanking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Ranking de Produtos por Movimentação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-3 font-medium">Posição</th>
                    <th className="text-left p-3 font-medium">Produto</th>
                    <th className="text-right p-3 font-medium">Qtd. Movimentada</th>
                    <th className="text-right p-3 font-medium">Valor Movimentado</th>
                    <th className="text-right p-3 font-medium">Nº Movimentações</th>
                    <th className="text-center p-3 font-medium">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingProdutos.produtos?.map((produto: ProdutoRanking, index: number) => (
                    <tr key={produto.produto_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <span className="font-bold text-lg">{index + 1}º</span>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{produto.produto_nome}</div>
                          <div className="text-sm text-gray-500">{produto.produto_codigo}</div>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {produto.quantidade_movimentada.toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-mono font-medium">
                        R$ {produto.valor_movimentado.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right">
                        {produto.numero_movimentacoes}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          produto.tipo_analise === 'ENTRADA' 
                            ? 'text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900'
                            : 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900'
                        }`}>
                          {produto.tipo_analise === 'ENTRADA' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {produto.tipo_analise}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Alertas */}
      {filtros.tipo_relatorio === 'ALERTAS' && alertasSummary && !loadingAlertas && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Alertas por Criticidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(alertasSummary.alertas_por_criticidade).map(([criticidade, quantidade]: [string, number]) => (
                  <div key={criticidade} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${
                        criticidade === 'CRITICA' ? 'bg-red-500' :
                        criticidade === 'ALTA' ? 'bg-orange-500' :
                        criticidade === 'MEDIA' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="font-medium">{criticidade}</span>
                    </div>
                    <span className="text-xl font-bold">{quantidade}</span>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total de Alertas</span>
                    <span className="text-2xl font-bold text-red-600">{alertasSummary.total_alertas}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertasSummary.alertas_por_tipo?.map((item) => (
                  <div key={item.tipo} className="flex items-center justify-between p-2 border-b">
                    <span className="text-sm">{item.tipo.replace('_', ' ')}</span>
                    <span className="font-medium">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (
        (filtros.tipo_relatorio === 'MOVIMENTACOES' && (!movimentacoes || !movimentacoes.resumo?.length)) ||
        (filtros.tipo_relatorio === 'ESTOQUE_VALOR' && (!estoqueValor || !estoqueValor.categorias?.length)) ||
        (filtros.tipo_relatorio === 'RANKING_PRODUTOS' && (!rankingProdutos || !rankingProdutos.produtos?.length)) ||
        (filtros.tipo_relatorio === 'ALERTAS' && (!alertasSummary || alertasSummary.total_alertas === 0))
      ) && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhum dado encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Não há dados para o período e filtros selecionados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}