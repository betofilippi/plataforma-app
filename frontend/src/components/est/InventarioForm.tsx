'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { api } from '@/lib/api'
import { 
  BarChart3, 
  Package, 
  Calendar, 
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  Search
} from 'lucide-react'

const inventarioSchema = z.object({
  numero_inventario: z.string().min(1, 'Número do inventário é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  data_inventario: z.string().min(1, 'Data é obrigatória'),
  deposito_id: z.number().min(1, 'Depósito é obrigatório'),
  tipo_inventario: z.enum(['COMPLETO', 'PARCIAL', 'CICLICO']),
  observacoes: z.string().optional(),
  itens: z.array(z.object({
    produto_id: z.number(),
    produto_nome: z.string().optional(),
    produto_codigo: z.string().optional(),
    quantidade_sistema: z.number(),
    quantidade_contada: z.number(),
    custo_unitario: z.number(),
    divergencia: z.number().optional(),
    percentual_divergencia: z.number().optional(),
    observacoes_item: z.string().optional()
  })).min(1, 'Pelo menos um item é obrigatório')
})

type InventarioFormData = z.infer<typeof inventarioSchema>

interface InventarioFormProps {
  isOpen: boolean
  onClose: () => void
  inventarioId?: number
  onSuccess?: () => void
}

interface ProdutoEstoque {
  produto_id: number
  produto_nome: string
  produto_codigo: string
  quantidade_atual: number
  custo_medio_ponderado: number
}

export default function InventarioForm({
  isOpen,
  onClose,
  inventarioId,
  onSuccess
}: InventarioFormProps) {
  const queryClient = useQueryClient()
  const [selectedDeposito, setSelectedDeposito] = useState<number | null>(null)
  const [showProdutoSelector, setShowProdutoSelector] = useState(false)
  const [searchProduto, setSearchProduto] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<InventarioFormData>({
    resolver: zodResolver(inventarioSchema),
    defaultValues: {
      data_inventario: new Date().toISOString().split('T')[0],
      tipo_inventario: 'PARCIAL',
      itens: []
    }
  })

  const watchItens = watch('itens') || []
  const watchDeposito = watch('deposito_id')

  // Query para depósitos
  const { data: depositos } = useQuery({
    queryKey: ['depositos'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/est/depositos').then(res => res.data)
  })

  // Query para produtos do depósito selecionado
  const { data: produtosEstoque } = useQuery({
    queryKey: ['produtos-estoque', watchDeposito],
    queryFn: () => watchDeposito ? 
      api.get<{ items: ProdutoEstoque[] }>(`/api/est/saldos?deposito_id=${watchDeposito}`).then(res => res.data?.items || []) : [],
    enabled: !!watchDeposito
  })

  // Query para inventário existente (edição)
  const { data: inventarioExistente } = useQuery({
    queryKey: ['inventario', inventarioId],
    queryFn: () => inventarioId ? 
      api.get<any>(`/api/est/inventarios/${inventarioId}`).then(res => res.data) : null,
    enabled: !!inventarioId
  })

  // Mutation para criar/atualizar inventário
  const saveInventario = useMutation({
    mutationFn: (data: InventarioFormData) => {
      if (inventarioId) {
        return api.put(`/api/est/inventarios/${inventarioId}`, data)
      } else {
        return api.post('/api/est/inventarios', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-metrics'] })
      onSuccess?.()
      onClose()
      reset()
    }
  })

  // Mutation para processar inventário (gerar ajustes)
  const processarInventario = useMutation({
    mutationFn: (inventarioId: number) => 
      api.post(`/api/est/inventarios/${inventarioId}/processar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] })
      onSuccess?.()
      onClose()
    }
  })

  useEffect(() => {
    if (inventarioExistente) {
      setValue('numero_inventario', inventarioExistente.numero_inventario)
      setValue('descricao', inventarioExistente.descricao)
      setValue('data_inventario', inventarioExistente.data_inventario.split('T')[0])
      setValue('deposito_id', inventarioExistente.deposito_id)
      setValue('tipo_inventario', inventarioExistente.tipo_inventario)
      setValue('observacoes', inventarioExistente.observacoes || '')
      setValue('itens', inventarioExistente.itens || [])
      setSelectedDeposito(inventarioExistente.deposito_id)
    }
  }, [inventarioExistente, setValue])

  const onSubmit = (data: InventarioFormData) => {
    // Calcular divergências
    const itensComDivergencia = data.itens.map(item => {
      const divergencia = item.quantidade_contada - item.quantidade_sistema
      const percentualDivergencia = item.quantidade_sistema > 0 
        ? (divergencia / item.quantidade_sistema) * 100 
        : 0

      return {
        ...item,
        divergencia,
        percentual_divergencia: percentualDivergencia
      }
    })

    saveInventario.mutate({
      ...data,
      itens: itensComDivergencia
    })
  }

  const handleAddProduto = (produto: ProdutoEstoque) => {
    const itensAtuais = watchItens
    const jaExiste = itensAtuais.find(item => item.produto_id === produto.produto_id)
    
    if (!jaExiste) {
      const novosItens = [...itensAtuais, {
        produto_id: produto.produto_id,
        produto_nome: produto.produto_nome,
        produto_codigo: produto.produto_codigo,
        quantidade_sistema: produto.quantidade_atual,
        quantidade_contada: produto.quantidade_atual,
        custo_unitario: produto.custo_medio_ponderado
      }]
      setValue('itens', novosItens)
    }
    setShowProdutoSelector(false)
    setSearchProduto('')
  }

  const handleRemoveItem = (index: number) => {
    const itensAtuais = watchItens
    const novosItens = itensAtuais.filter((_, i) => i !== index)
    setValue('itens', novosItens)
  }

  const handleUpdateQuantidade = (index: number, quantidade: number) => {
    const itensAtuais = [...watchItens]
    itensAtuais[index].quantidade_contada = quantidade
    setValue('itens', itensAtuais)
  }

  const calcularTotais = () => {
    const totais = watchItens.reduce((acc, item) => {
      const divergencia = item.quantidade_contada - item.quantidade_sistema
      const valorDivergencia = divergencia * item.custo_unitario
      
      return {
        totalItens: acc.totalItens + 1,
        totalDivergencias: acc.totalDivergencias + Math.abs(divergencia),
        valorTotalDivergencia: acc.valorTotalDivergencia + Math.abs(valorDivergencia),
        itensComDivergencia: acc.itensComDivergencia + (divergencia !== 0 ? 1 : 0)
      }
    }, {
      totalItens: 0,
      totalDivergencias: 0,
      valorTotalDivergencia: 0,
      itensComDivergencia: 0
    })

    return totais
  }

  const filteredProdutos = produtosEstoque?.filter((produto: ProdutoEstoque) =>
    produto.produto_nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
    produto.produto_codigo.toLowerCase().includes(searchProduto.toLowerCase())
  ) || []

  if (!isOpen) return null

  const totais = calcularTotais()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <CardTitle>
                {inventarioId ? 'Editar Inventário' : 'Novo Inventário'}
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Realize a contagem física dos produtos em estoque
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Número do Inventário *
                </label>
                <Input
                  {...register('numero_inventario')}
                  placeholder="INV-001"
                />
                {errors.numero_inventario && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.numero_inventario.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Data do Inventário *
                </label>
                <Input
                  type="date"
                  {...register('data_inventario')}
                />
                {errors.data_inventario && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.data_inventario.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo de Inventário
                </label>
                <select
                  {...register('tipo_inventario')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="PARCIAL">Parcial</option>
                  <option value="COMPLETO">Completo</option>
                  <option value="CICLICO">Cíclico</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Depósito *
                </label>
                <select
                  {...register('deposito_id', { valueAsNumber: true })}
                  className="w-full p-2 border rounded-md"
                  onChange={(e) => {
                    const depositoId = Number(e.target.value)
                    setSelectedDeposito(depositoId)
                    setValue('deposito_id', depositoId)
                    setValue('itens', []) // Limpar itens ao trocar depósito
                  }}
                >
                  <option value="">Selecione o depósito</option>
                  {depositos?.map((deposito: any) => (
                    <option key={deposito.id} value={deposito.id}>
                      {deposito.nome}
                    </option>
                  ))}
                </select>
                {errors.deposito_id && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.deposito_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descrição *
                </label>
                <Input
                  {...register('descricao')}
                  placeholder="Descrição do inventário"
                />
                {errors.descricao && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.descricao.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Observações
              </label>
              <textarea
                {...register('observacoes')}
                className="w-full p-2 border rounded-md h-20 resize-none"
                placeholder="Observações sobre o inventário..."
              />
            </div>

            {/* Resumo */}
            {watchItens.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totais.totalItens}</div>
                  <div className="text-sm text-gray-600">Total de Itens</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totais.itensComDivergencia}</div>
                  <div className="text-sm text-gray-600">Com Divergência</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {totais.totalDivergencias.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600">Total Divergências</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    R$ {totais.valorTotalDivergencia.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Valor Divergência</div>
                </div>
              </div>
            )}

            {/* Adicionar Produtos */}
            {selectedDeposito && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Itens do Inventário</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProdutoSelector(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>

                {/* Lista de Itens */}
                {watchItens.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <th className="border p-2 text-left">Produto</th>
                          <th className="border p-2 text-right">Qtd. Sistema</th>
                          <th className="border p-2 text-right">Qtd. Contada</th>
                          <th className="border p-2 text-right">Divergência</th>
                          <th className="border p-2 text-right">%</th>
                          <th className="border p-2 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {watchItens.map((item, index) => {
                          const divergencia = item.quantidade_contada - item.quantidade_sistema
                          const percentual = item.quantidade_sistema > 0 
                            ? (divergencia / item.quantidade_sistema) * 100 
                            : 0

                          return (
                            <tr key={item.produto_id}>
                              <td className="border p-2">
                                <div>
                                  <div className="font-medium text-sm">{item.produto_nome}</div>
                                  <div className="text-xs text-gray-500">{item.produto_codigo}</div>
                                </div>
                              </td>
                              <td className="border p-2 text-right font-mono">
                                {item.quantidade_sistema.toFixed(3)}
                              </td>
                              <td className="border p-2">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={item.quantidade_contada}
                                  onChange={(e) => handleUpdateQuantidade(index, Number(e.target.value))}
                                  className="w-24 text-right"
                                />
                              </td>
                              <td className={`border p-2 text-right font-mono ${
                                divergencia > 0 ? 'text-green-600' : 
                                divergencia < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {divergencia > 0 ? '+' : ''}{divergencia.toFixed(3)}
                              </td>
                              <td className={`border p-2 text-right font-mono ${
                                Math.abs(percentual) > 5 ? 'text-red-600 font-bold' : 'text-gray-600'
                              }`}>
                                {percentual > 0 ? '+' : ''}{percentual.toFixed(1)}%
                              </td>
                              <td className="border p-2 text-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
                  </div>
                )}
              </div>
            )}

            {/* Selector de Produtos */}
            {showProdutoSelector && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Selecionar Produtos</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowProdutoSelector(false)
                          setSearchProduto('')
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Buscar produto..."
                          value={searchProduto}
                          onChange={(e) => setSearchProduto(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredProdutos.map((produto: ProdutoEstoque) => (
                          <div
                            key={produto.produto_id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <div>
                              <div className="font-medium">{produto.produto_nome}</div>
                              <div className="text-sm text-gray-500">
                                {produto.produto_codigo} • Estoque: {produto.quantidade_atual}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddProduto(produto)}
                            >
                              Adicionar
                            </Button>
                          </div>
                        ))}
                        {filteredProdutos.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            Nenhum produto encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Error Message */}
            {saveInventario.isError && (
              <Alert className="bg-red-50 border-red-200">
                <FileText className="w-4 h-4" />
                <div>
                  <h4 className="font-medium text-red-800">Erro ao salvar</h4>
                  <p className="text-sm text-red-600">
                    {saveInventario.error?.message || 'Erro interno do servidor'}
                  </p>
                </div>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saveInventario.isPending || processarInventario.isPending}
              >
                Cancelar
              </Button>
              
              {inventarioId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => processarInventario.mutate(inventarioId)}
                  disabled={saveInventario.isPending || processarInventario.isPending}
                >
                  {processarInventario.isPending ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Processar Inventário
                    </>
                  )}
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={saveInventario.isPending || processarInventario.isPending}
              >
                {saveInventario.isPending ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Inventário
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}