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
  TrendingUp, 
  TrendingDown, 
  Package, 
  Calendar, 
  FileText,
  Save,
  X 
} from 'lucide-react'

const movimentacaoSchema = z.object({
  tipo_movimentacao: z.enum(['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE']),
  origem_movimentacao: z.enum([
    'COMPRA', 'VENDA', 'TRANSFERENCIA', 'AJUSTE_MANUAL', 
    'INVENTARIO', 'DEVOLUCAO_CLIENTE', 'DEVOLUCAO_FORNECEDOR',
    'PRODUCAO', 'CONSUMO_PRODUCAO', 'CORRECAO'
  ]),
  produto_id: z.number().min(1, 'Produto é obrigatório'),
  deposito_origem_id: z.number().optional(),
  deposito_destino_id: z.number().optional(),
  lote_id: z.number().optional(),
  quantidade: z.number().min(0.001, 'Quantidade deve ser maior que zero'),
  custo_unitario: z.number().min(0, 'Custo deve ser maior ou igual a zero'),
  preco_venda: z.number().optional(),
  numero_documento: z.string().optional(),
  observacoes: z.string().optional(),
  data_movimentacao: z.string().optional()
})

type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>

interface MovimentacaoFormProps {
  isOpen: boolean
  onClose: () => void
  tipoDefault?: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE'
  produtoId?: number
  onSuccess?: () => void
}

export default function MovimentacaoForm({
  isOpen,
  onClose,
  tipoDefault = 'ENTRADA',
  produtoId,
  onSuccess
}: MovimentacaoFormProps) {
  const queryClient = useQueryClient()
  const [selectedTipo, setSelectedTipo] = useState(tipoDefault)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<MovimentacaoFormData>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: {
      tipo_movimentacao: tipoDefault,
      origem_movimentacao: tipoDefault === 'ENTRADA' ? 'COMPRA' : 'VENDA',
      data_movimentacao: new Date().toISOString().split('T')[0]
    }
  })

  const watchProdutoId = watch('produto_id')
  const watchQuantidade = watch('quantidade')
  const watchCustoUnitario = watch('custo_unitario')

  // Queries para dados necessários
  const { data: produtos } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => api.get<{ id: number; codigo: string; nome: string }[]>('/api/cad/products').then(res => res.data)
  })

  const { data: depositos } = useQuery({
    queryKey: ['depositos'],
    queryFn: () => api.get<{ id: number; nome: string }[]>('/api/est/depositos').then(res => res.data)
  })

  const { data: lotes } = useQuery({
    queryKey: ['lotes-produto', watchProdutoId],
    queryFn: () => watchProdutoId ? api.get<{ items: any[] }>(`/api/est/lotes?produto_id=${watchProdutoId}`).then(res => res.data?.items || []) : [],
    enabled: !!watchProdutoId
  })

  const { data: saldoAtual } = useQuery({
    queryKey: ['saldo-produto', watchProdutoId],
    queryFn: () => watchProdutoId ? api.get<any>(`/api/est/saldos?produto_id=${watchProdutoId}`).then(res => res.data) : null,
    enabled: !!watchProdutoId
  })

  // Mutation para criar movimentação
  const createMovimentacao = useMutation({
    mutationFn: (data: MovimentacaoFormData) => 
      api.post('/api/est/movimentacoes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentos-recentes'] })
      queryClient.invalidateQueries({ queryKey: ['saldo-produto'] })
      onSuccess?.()
      onClose()
      reset()
    }
  })

  useEffect(() => {
    if (produtoId) {
      setValue('produto_id', produtoId)
    }
  }, [produtoId, setValue])

  useEffect(() => {
    setSelectedTipo(tipoDefault)
    setValue('tipo_movimentacao', tipoDefault)
    setValue('origem_movimentacao', tipoDefault === 'ENTRADA' ? 'COMPRA' : 'VENDA')
  }, [tipoDefault, setValue])

  const onSubmit = (data: MovimentacaoFormData) => {
    createMovimentacao.mutate(data)
  }

  const origemOptions = {
    ENTRADA: [
      { value: 'COMPRA', label: 'Compra' },
      { value: 'DEVOLUCAO_CLIENTE', label: 'Devolução de Cliente' },
      { value: 'PRODUCAO', label: 'Produção' },
      { value: 'AJUSTE_MANUAL', label: 'Ajuste Manual' },
      { value: 'CORRECAO', label: 'Correção' }
    ],
    SAIDA: [
      { value: 'VENDA', label: 'Venda' },
      { value: 'DEVOLUCAO_FORNECEDOR', label: 'Devolução para Fornecedor' },
      { value: 'CONSUMO_PRODUCAO', label: 'Consumo em Produção' },
      { value: 'AJUSTE_MANUAL', label: 'Ajuste Manual' },
      { value: 'CORRECAO', label: 'Correção' }
    ],
    TRANSFERENCIA: [
      { value: 'TRANSFERENCIA', label: 'Transferência entre Depósitos' }
    ],
    AJUSTE: [
      { value: 'AJUSTE_MANUAL', label: 'Ajuste Manual' },
      { value: 'INVENTARIO', label: 'Inventário' },
      { value: 'CORRECAO', label: 'Correção' }
    ]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedTipo === 'ENTRADA' ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : selectedTipo === 'SAIDA' ? (
                <TrendingDown className="w-5 h-5 text-red-500" />
              ) : (
                <Package className="w-5 h-5 text-blue-500" />
              )}
              <CardTitle>
                Nova Movimentação - {selectedTipo}
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
            Registre entradas, saídas ou transferências de estoque
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de Movimentação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo de Movimentação
                </label>
                <select
                  {...register('tipo_movimentacao')}
                  className="w-full p-2 border rounded-md"
                  onChange={(e) => {
                    const tipo = e.target.value as typeof selectedTipo
                    setSelectedTipo(tipo)
                    setValue('tipo_movimentacao', tipo)
                    // Reset origem when tipo changes
                    setValue('origem_movimentacao', origemOptions[tipo][0].value as any)
                  }}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
                {errors.tipo_movimentacao && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.tipo_movimentacao.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Origem da Movimentação
                </label>
                <select
                  {...register('origem_movimentacao')}
                  className="w-full p-2 border rounded-md"
                >
                  {origemOptions[selectedTipo].map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.origem_movimentacao && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.origem_movimentacao.message}
                  </p>
                )}
              </div>
            </div>

            {/* Produto */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Produto *
              </label>
              <select
                {...register('produto_id', { valueAsNumber: true })}
                className="w-full p-2 border rounded-md"
                disabled={!!produtoId}
              >
                <option value="">Selecione um produto</option>
                {produtos?.map((produto: any) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.codigo} - {produto.nome}
                  </option>
                ))}
              </select>
              {errors.produto_id && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.produto_id.message}
                </p>
              )}
            </div>

            {/* Saldo Atual */}
            {saldoAtual && (
              <Alert className="bg-blue-50 border-blue-200">
                <Package className="w-4 h-4" />
                <div>
                  <h4 className="font-medium">Saldo Atual</h4>
                  <p className="text-sm">
                    Quantidade disponível: {saldoAtual.quantidade_disponivel} • 
                    Custo médio: R$ {saldoAtual.custo_medio_ponderado}
                  </p>
                </div>
              </Alert>
            )}

            {/* Depósitos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTipo === 'TRANSFERENCIA' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Depósito Origem *
                    </label>
                    <select
                      {...register('deposito_origem_id', { valueAsNumber: true })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Selecione o depósito</option>
                      {depositos?.map((deposito: any) => (
                        <option key={deposito.id} value={deposito.id}>
                          {deposito.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Depósito Destino *
                    </label>
                    <select
                      {...register('deposito_destino_id', { valueAsNumber: true })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Selecione o depósito</option>
                      {depositos?.map((deposito: any) => (
                        <option key={deposito.id} value={deposito.id}>
                          {deposito.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Depósito
                  </label>
                  <select
                    {...register(selectedTipo === 'ENTRADA' ? 'deposito_destino_id' : 'deposito_origem_id', { valueAsNumber: true })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Selecione o depósito</option>
                    {depositos?.map((deposito: any) => (
                      <option key={deposito.id} value={deposito.id}>
                        {deposito.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Lote */}
            {lotes && lotes.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Lote (Opcional)
                </label>
                <select
                  {...register('lote_id', { valueAsNumber: true })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Sem lote específico</option>
                  {lotes.map((lote: any) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.numero_lote} - Qtd: {lote.quantidade_atual} - Venc: {lote.data_validade ? new Date(lote.data_validade).toLocaleDateString('pt-BR') : 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantidade e Valores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantidade *
                </label>
                <Input
                  type="number"
                  step="0.001"
                  {...register('quantidade', { valueAsNumber: true })}
                  placeholder="0.000"
                />
                {errors.quantidade && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.quantidade.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Custo Unitário *
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  {...register('custo_unitario', { valueAsNumber: true })}
                  placeholder="0.0000"
                />
                {errors.custo_unitario && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.custo_unitario.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor Total
                </label>
                <Input
                  type="text"
                  value={watchQuantidade && watchCustoUnitario 
                    ? `R$ ${(watchQuantidade * watchCustoUnitario).toFixed(2)}`
                    : 'R$ 0,00'
                  }
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* Preço de Venda (apenas para saídas) */}
            {selectedTipo === 'SAIDA' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preço de Venda (Opcional)
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  {...register('preco_venda', { valueAsNumber: true })}
                  placeholder="0.0000"
                />
              </div>
            )}

            {/* Documento e Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Número do Documento
                </label>
                <Input
                  {...register('numero_documento')}
                  placeholder="Ex: NF-001234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Data da Movimentação
                </label>
                <Input
                  type="date"
                  {...register('data_movimentacao')}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Observações
              </label>
              <textarea
                {...register('observacoes')}
                className="w-full p-2 border rounded-md h-20 resize-none"
                placeholder="Observações adicionais sobre a movimentação..."
              />
            </div>

            {/* Error Message */}
            {createMovimentacao.isError && (
              <Alert className="bg-red-50 border-red-200">
                <FileText className="w-4 h-4" />
                <div>
                  <h4 className="font-medium text-red-800">Erro ao salvar</h4>
                  <p className="text-sm text-red-600">
                    {createMovimentacao.error?.message || 'Erro interno do servidor'}
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
                disabled={createMovimentacao.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMovimentacao.isPending}
              >
                {createMovimentacao.isPending ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Movimentação
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