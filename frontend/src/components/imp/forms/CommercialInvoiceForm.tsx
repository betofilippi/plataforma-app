'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CommercialInvoiceItem {
  id?: number;
  descricao_produto: string;
  quantidade: number;
  preco_unitario_usd: number;
  valor_total_usd: number;
  unidade_medida: string;
  codigo_produto?: string;
  peso_liquido_kg?: number;
  peso_bruto_kg?: number;
  pais_origem: string;
  classificacao_ncm?: string;
}

interface CommercialInvoiceData {
  id?: number;
  importacao_01_1_proforma_invoice_id?: number;
  numero_commercial_invoice: string;
  data_commercial_invoice: string;
  exportador_nome: string;
  exportador_endereco: string;
  exportador_pais: string;
  importador_nome: string;
  importador_endereco: string;
  importador_pais: string;
  valor_total_usd: number;
  peso_total_liquido_kg?: number;
  peso_total_bruto_kg?: number;
  incoterm: string;
  local_embarque: string;
  local_desembarque: string;
  navio_voo?: string;
  data_embarque?: string;
  observacoes?: string;
  status: string;
  items?: CommercialInvoiceItem[];
}

interface CommercialInvoiceFormProps {
  initialData?: CommercialInvoiceData;
  onSubmit: (data: CommercialInvoiceData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CommercialInvoiceForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: CommercialInvoiceFormProps) {
  const [formData, setFormData] = useState<CommercialInvoiceData>({
    numero_commercial_invoice: '',
    data_commercial_invoice: '',
    exportador_nome: '',
    exportador_endereco: '',
    exportador_pais: '',
    importador_nome: '',
    importador_endereco: '',
    importador_pais: 'Brasil',
    valor_total_usd: 0,
    peso_total_liquido_kg: 0,
    peso_total_bruto_kg: 0,
    incoterm: 'FOB',
    local_embarque: '',
    local_desembarque: '',
    navio_voo: '',
    data_embarque: '',
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

  const handleInputChange = (field: keyof CommercialInvoiceData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = (index: number, field: keyof CommercialInvoiceItem, value: any) => {
    const updatedItems = [...(formData.items || [])];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Calculate total for item if quantity or price changes
    if (field === 'quantidade' || field === 'preco_unitario_usd') {
      const item = updatedItems[index];
      item.valor_total_usd = item.quantidade * item.preco_unitario_usd;
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    calculateTotals(updatedItems);
  };

  const addItem = () => {
    const newItem: CommercialInvoiceItem = {
      descricao_produto: '',
      quantidade: 1,
      preco_unitario_usd: 0,
      valor_total_usd: 0,
      unidade_medida: 'PCS',
      codigo_produto: '',
      peso_liquido_kg: 0,
      peso_bruto_kg: 0,
      pais_origem: '',
      classificacao_ncm: ''
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

  const calculateTotals = (items: CommercialInvoiceItem[]) => {
    const valorTotal = items.reduce((sum, item) => sum + item.valor_total_usd, 0);
    const pesoLiquido = items.reduce((sum, item) => sum + (item.peso_liquido_kg || 0), 0);
    const pesoBruto = items.reduce((sum, item) => sum + (item.peso_bruto_kg || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      valor_total_usd: valorTotal,
      peso_total_liquido_kg: pesoLiquido,
      peso_total_bruto_kg: pesoBruto
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numero_commercial_invoice.trim()) {
      newErrors.numero_commercial_invoice = 'Número da commercial invoice é obrigatório';
    }

    if (!formData.data_commercial_invoice) {
      newErrors.data_commercial_invoice = 'Data da commercial invoice é obrigatória';
    }

    if (!formData.exportador_nome.trim()) {
      newErrors.exportador_nome = 'Nome do exportador é obrigatório';
    }

    if (!formData.importador_nome.trim()) {
      newErrors.importador_nome = 'Nome do importador é obrigatório';
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
        newErrors[`item_${index}_descricao`] = 'Descrição é obrigatória';
      }
      if (item.quantidade <= 0) {
        newErrors[`item_${index}_quantidade`] = 'Quantidade deve ser maior que zero';
      }
      if (item.preco_unitario_usd <= 0) {
        newErrors[`item_${index}_preco`] = 'Preço deve ser maior que zero';
      }
      if (!item.pais_origem.trim()) {
        newErrors[`item_${index}_origem`] = 'País de origem é obrigatório';
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
        <h3 className="text-lg font-semibold mb-4">Dados da Commercial Invoice</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Número da Commercial Invoice *
            </label>
            <Input
              value={formData.numero_commercial_invoice}
              onChange={(e) => handleInputChange('numero_commercial_invoice', e.target.value)}
              placeholder="Ex: CI-2024-001"
              className={errors.numero_commercial_invoice ? 'border-red-500' : ''}
            />
            {errors.numero_commercial_invoice && (
              <p className="text-red-500 text-xs mt-1">{errors.numero_commercial_invoice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Data da Commercial Invoice *
            </label>
            <Input
              type="date"
              value={formData.data_commercial_invoice}
              onChange={(e) => handleInputChange('data_commercial_invoice', e.target.value)}
              className={errors.data_commercial_invoice ? 'border-red-500' : ''}
            />
            {errors.data_commercial_invoice && (
              <p className="text-red-500 text-xs mt-1">{errors.data_commercial_invoice}</p>
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
            <label className="block text-sm font-medium mb-1">Local de Embarque</label>
            <Input
              value={formData.local_embarque}
              onChange={(e) => handleInputChange('local_embarque', e.target.value)}
              placeholder="Porto ou aeroporto de embarque"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Local de Desembarque</label>
            <Input
              value={formData.local_desembarque}
              onChange={(e) => handleInputChange('local_desembarque', e.target.value)}
              placeholder="Porto ou aeroporto de desembarque"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Navio/Voo</label>
            <Input
              value={formData.navio_voo}
              onChange={(e) => handleInputChange('navio_voo', e.target.value)}
              placeholder="Nome do navio ou número do voo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data de Embarque</label>
            <Input
              type="date"
              value={formData.data_embarque}
              onChange={(e) => handleInputChange('data_embarque', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Exportador Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dados do Exportador</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome do Exportador *
            </label>
            <Input
              value={formData.exportador_nome}
              onChange={(e) => handleInputChange('exportador_nome', e.target.value)}
              placeholder="Nome da empresa exportadora"
              className={errors.exportador_nome ? 'border-red-500' : ''}
            />
            {errors.exportador_nome && (
              <p className="text-red-500 text-xs mt-1">{errors.exportador_nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">País do Exportador</label>
            <Input
              value={formData.exportador_pais}
              onChange={(e) => handleInputChange('exportador_pais', e.target.value)}
              placeholder="País de origem"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Endereço do Exportador</label>
          <textarea
            value={formData.exportador_endereco}
            onChange={(e) => handleInputChange('exportador_endereco', e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Endereço completo do exportador"
          />
        </div>
      </Card>

      {/* Importador Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dados do Importador</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome do Importador *
            </label>
            <Input
              value={formData.importador_nome}
              onChange={(e) => handleInputChange('importador_nome', e.target.value)}
              placeholder="Nome da empresa importadora"
              className={errors.importador_nome ? 'border-red-500' : ''}
            />
            {errors.importador_nome && (
              <p className="text-red-500 text-xs mt-1">{errors.importador_nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">País do Importador</label>
            <Input
              value={formData.importador_pais}
              onChange={(e) => handleInputChange('importador_pais', e.target.value)}
              placeholder="País de destino"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Endereço do Importador</label>
          <textarea
            value={formData.importador_endereco}
            onChange={(e) => handleInputChange('importador_endereco', e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Endereço completo do importador"
          />
        </div>
      </Card>

      {/* Items Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Itens da Commercial Invoice</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Descrição do Produto *
                  </label>
                  <Input
                    value={item.descricao_produto}
                    onChange={(e) => handleItemChange(index, 'descricao_produto', e.target.value)}
                    placeholder="Descrição detalhada do produto"
                    className={errors[`item_${index}_descricao`] ? 'border-red-500' : ''}
                  />
                  {errors[`item_${index}_descricao`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_descricao`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Código/HS Code</label>
                  <Input
                    value={item.codigo_produto || ''}
                    onChange={(e) => handleItemChange(index, 'codigo_produto', e.target.value)}
                    placeholder="Código do produto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">NCM</label>
                  <Input
                    value={item.classificacao_ncm || ''}
                    onChange={(e) => handleItemChange(index, 'classificacao_ncm', e.target.value)}
                    placeholder="Classificação NCM"
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
                    value={item.preco_unitario_usd}
                    onChange={(e) => handleItemChange(index, 'preco_unitario_usd', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={errors[`item_${index}_preco`] ? 'border-red-500' : ''}
                  />
                  {errors[`item_${index}_preco`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_preco`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    País de Origem *
                  </label>
                  <Input
                    value={item.pais_origem}
                    onChange={(e) => handleItemChange(index, 'pais_origem', e.target.value)}
                    placeholder="País de origem do produto"
                    className={errors[`item_${index}_origem`] ? 'border-red-500' : ''}
                  />
                  {errors[`item_${index}_origem`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_origem`]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Peso Líquido (kg)</label>
                  <Input
                    type="number"
                    value={item.peso_liquido_kg || 0}
                    onChange={(e) => handleItemChange(index, 'peso_liquido_kg', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Peso Bruto (kg)</label>
                  <Input
                    type="number"
                    value={item.peso_bruto_kg || 0}
                    onChange={(e) => handleItemChange(index, 'peso_bruto_kg', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valor Total (USD)</label>
                  <Input
                    type="number"
                    value={item.valor_total_usd}
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
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium mb-1">Peso Líquido Total (kg)</label>
            <Input
              type="number"
              value={formData.peso_total_liquido_kg || 0}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Peso Bruto Total (kg)</label>
            <Input
              type="number"
              value={formData.peso_total_bruto_kg || 0}
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

      {/* Observações */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Observações</h3>
        <textarea
          value={formData.observacoes}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          className="w-full p-2 border rounded-md"
          rows={4}
          placeholder="Observações adicionais sobre a commercial invoice"
        />
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
              {initialData ? 'Atualizar' : 'Criar'} Commercial Invoice
            </>
          )}
        </Button>
      </div>
    </form>
  );
}