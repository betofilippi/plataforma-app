'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProformaInvoiceItem {
  id?: number;
  descricao_produto: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  unidade_medida: string;
  codigo_produto?: string;
  peso_liquido?: number;
  peso_bruto?: number;
}

interface ProformaInvoiceData {
  id?: number;
  numero_invoice: string;
  data_invoice: string;
  fornecedor_nome: string;
  fornecedor_endereco: string;
  fornecedor_pais: string;
  valor_total_usd: number;
  peso_total_kg?: number;
  incoterm: string;
  local_entrega: string;
  forma_pagamento: string;
  prazo_pagamento: string;
  observacoes?: string;
  status: string;
  items?: ProformaInvoiceItem[];
}

interface ProformaInvoiceFormProps {
  initialData?: ProformaInvoiceData;
  onSubmit: (data: ProformaInvoiceData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProformaInvoiceForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: ProformaInvoiceFormProps) {
  const [formData, setFormData] = useState<ProformaInvoiceData>({
    numero_invoice: '',
    data_invoice: '',
    fornecedor_nome: '',
    fornecedor_endereco: '',
    fornecedor_pais: '',
    valor_total_usd: 0,
    peso_total_kg: 0,
    incoterm: 'FOB',
    local_entrega: '',
    forma_pagamento: 'T/T',
    prazo_pagamento: '',
    observacoes: '',
    status: 'pending',
    items: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        items: initialData.items || []
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof ProformaInvoiceData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = (index: number, field: keyof ProformaInvoiceItem, value: any) => {
    const updatedItems = [...(formData.items || [])];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Calculate total for item if quantity or price changes
    if (field === 'quantidade' || field === 'preco_unitario') {
      const item = updatedItems[index];
      item.valor_total = item.quantidade * item.preco_unitario;
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Recalculate total invoice value
    calculateTotals(updatedItems);
  };

  const addItem = () => {
    const newItem: ProformaInvoiceItem = {
      descricao_produto: '',
      quantidade: 1,
      preco_unitario: 0,
      valor_total: 0,
      unidade_medida: 'PCS',
      codigo_produto: '',
      peso_liquido: 0,
      peso_bruto: 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const removeItem = (index: number) => {
    const updatedItems = (formData.items || []).filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    calculateTotals(updatedItems);
  };

  const calculateTotals = (items: ProformaInvoiceItem[]) => {
    const valorTotal = items.reduce((sum, item) => sum + item.valor_total, 0);
    const pesoTotal = items.reduce((sum, item) => sum + (item.peso_bruto || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      valor_total_usd: valorTotal,
      peso_total_kg: pesoTotal
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numero_invoice.trim()) {
      newErrors.numero_invoice = 'Número da invoice é obrigatório';
    }

    if (!formData.data_invoice) {
      newErrors.data_invoice = 'Data da invoice é obrigatória';
    }

    if (!formData.fornecedor_nome.trim()) {
      newErrors.fornecedor_nome = 'Nome do fornecedor é obrigatório';
    }

    if (!formData.fornecedor_pais.trim()) {
      newErrors.fornecedor_pais = 'País do fornecedor é obrigatório';
    }

    if (formData.valor_total_usd <= 0) {
      newErrors.valor_total_usd = 'Valor total deve ser maior que zero';
    }

    if (!formData.items || formData.items.length === 0) {
      newErrors.items = 'Pelo menos um item é obrigatório';
    }

    // Validate items
    formData.items?.forEach((item, index) => {
      if (!item.descricao_produto.trim()) {
        newErrors[`item_${index}_descricao`] = 'Descrição do produto é obrigatória';
      }
      if (item.quantidade <= 0) {
        newErrors[`item_${index}_quantidade`] = 'Quantidade deve ser maior que zero';
      }
      if (item.preco_unitario <= 0) {
        newErrors[`item_${index}_preco`] = 'Preço unitário deve ser maior que zero';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Main Invoice Data */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dados da Proforma Invoice</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Número da Invoice *
            </label>
            <Input
              value={formData.numero_invoice}
              onChange={(e) => handleInputChange('numero_invoice', e.target.value)}
              placeholder="Ex: PI-2024-001"
              className={errors.numero_invoice ? 'border-red-500' : ''}
            />
            {errors.numero_invoice && (
              <p className="text-red-500 text-xs mt-1">{errors.numero_invoice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Data da Invoice *
            </label>
            <Input
              type="date"
              value={formData.data_invoice}
              onChange={(e) => handleInputChange('data_invoice', e.target.value)}
              className={errors.data_invoice ? 'border-red-500' : ''}
            />
            {errors.data_invoice && (
              <p className="text-red-500 text-xs mt-1">{errors.data_invoice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nome do Fornecedor *
            </label>
            <Input
              value={formData.fornecedor_nome}
              onChange={(e) => handleInputChange('fornecedor_nome', e.target.value)}
              placeholder="Nome da empresa fornecedora"
              className={errors.fornecedor_nome ? 'border-red-500' : ''}
            />
            {errors.fornecedor_nome && (
              <p className="text-red-500 text-xs mt-1">{errors.fornecedor_nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              País do Fornecedor *
            </label>
            <Input
              value={formData.fornecedor_pais}
              onChange={(e) => handleInputChange('fornecedor_pais', e.target.value)}
              placeholder="Ex: China, Estados Unidos"
              className={errors.fornecedor_pais ? 'border-red-500' : ''}
            />
            {errors.fornecedor_pais && (
              <p className="text-red-500 text-xs mt-1">{errors.fornecedor_pais}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Incoterm</label>
            <select
              value={formData.incoterm}
              onChange={(e) => handleInputChange('incoterm', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="FOB">FOB - Free On Board</option>
              <option value="CIF">CIF - Cost, Insurance and Freight</option>
              <option value="CFR">CFR - Cost and Freight</option>
              <option value="EXW">EXW - Ex Works</option>
              <option value="FCA">FCA - Free Carrier</option>
              <option value="CPT">CPT - Carriage Paid To</option>
              <option value="CIP">CIP - Carriage and Insurance Paid</option>
              <option value="DAP">DAP - Delivered At Place</option>
              <option value="DPU">DPU - Delivered at Place Unloaded</option>
              <option value="DDP">DDP - Delivered Duty Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
            <select
              value={formData.forma_pagamento}
              onChange={(e) => handleInputChange('forma_pagamento', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="T/T">T/T - Transferência Telegráfica</option>
              <option value="L/C">L/C - Carta de Crédito</option>
              <option value="D/P">D/P - Documents against Payment</option>
              <option value="D/A">D/A - Documents against Acceptance</option>
              <option value="Cash">Cash - À Vista</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="processing">Em Processamento</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prazo de Pagamento</label>
            <Input
              value={formData.prazo_pagamento}
              onChange={(e) => handleInputChange('prazo_pagamento', e.target.value)}
              placeholder="Ex: 30 dias, À vista"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Endereço do Fornecedor</label>
          <textarea
            value={formData.fornecedor_endereco}
            onChange={(e) => handleInputChange('fornecedor_endereco', e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Endereço completo do fornecedor"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Local de Entrega</label>
          <Input
            value={formData.local_entrega}
            onChange={(e) => handleInputChange('local_entrega', e.target.value)}
            placeholder="Porto ou local de entrega"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Observações</label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Observações adicionais"
          />
        </div>
      </Card>

      {/* Items Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Itens da Invoice</h3>
          <Button type="button" onClick={addItem} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        {errors.items && (
          <p className="text-red-500 text-sm mb-4">{errors.items}</p>
        )}

        <div className="space-y-4">
          {formData.items?.map((item, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Item {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Descrição do Produto *
                  </label>
                  <Input
                    value={item.descricao_produto}
                    onChange={(e) => handleItemChange(index, 'descricao_produto', e.target.value)}
                    placeholder="Descrição do produto"
                    className={errors[`item_${index}_descricao`] ? 'border-red-500' : ''}
                  />
                  {errors[`item_${index}_descricao`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_descricao`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Código</label>
                  <Input
                    value={item.codigo_produto || ''}
                    onChange={(e) => handleItemChange(index, 'codigo_produto', e.target.value)}
                    placeholder="Código/SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantidade *
                  </label>
                  <Input
                    type="number"
                    value={item.quantidade}
                    onChange={(e) => handleItemChange(index, 'quantidade', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={errors[`item_${index}_quantidade`] ? 'border-red-500' : ''}
                  />
                  {errors[`item_${index}_quantidade`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_quantidade`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unidade</label>
                  <select
                    value={item.unidade_medida}
                    onChange={(e) => handleItemChange(index, 'unidade_medida', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="PCS">PCS - Peças</option>
                    <option value="KG">KG - Quilograma</option>
                    <option value="M">M - Metro</option>
                    <option value="M2">M² - Metro Quadrado</option>
                    <option value="M3">M³ - Metro Cúbico</option>
                    <option value="L">L - Litro</option>
                    <option value="SET">SET - Conjunto</option>
                    <option value="PAIR">PAIR - Par</option>
                    <option value="BOX">BOX - Caixa</option>
                    <option value="PACK">PACK - Pacote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Preço Unit. (USD) *
                  </label>
                  <Input
                    type="number"
                    value={item.preco_unitario}
                    onChange={(e) => handleItemChange(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={errors[`item_${index}_preco`] ? 'border-red-500' : ''}
                  />
                  {errors[`item_${index}_preco`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_preco`]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Peso Líquido (kg)</label>
                  <Input
                    type="number"
                    value={item.peso_liquido || 0}
                    onChange={(e) => handleItemChange(index, 'peso_liquido', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Peso Bruto (kg)</label>
                  <Input
                    type="number"
                    value={item.peso_bruto || 0}
                    onChange={(e) => handleItemChange(index, 'peso_bruto', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valor Total (USD)</label>
                  <Input
                    type="number"
                    value={item.valor_total}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Totals Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo dos Totais</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Valor Total (USD)</label>
            <Input
              type="number"
              value={formData.valor_total_usd}
              readOnly
              className="bg-gray-50 font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Peso Total (kg)</label>
            <Input
              type="number"
              value={formData.peso_total_kg || 0}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantidade de Itens</label>
            <Input
              type="number"
              value={formData.items?.length || 0}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {initialData ? 'Atualizar' : 'Criar'} Proforma Invoice
            </>
          )}
        </Button>
      </div>
    </form>
  );
}