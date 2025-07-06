'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, Trash2, Save, X, Package, Box } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PackingListContainer {
  id?: number;
  numero_container: string;
  tipo_container: string;
  peso_tara_kg: number;
  peso_bruto_kg: number;
  peso_liquido_kg: number;
  dimensoes_comprimento_cm?: number;
  dimensoes_largura_cm?: number;
  dimensoes_altura_cm?: number;
  lacre_numero?: string;
  observacoes?: string;
}

interface PackingListItem {
  id?: number;
  descricao_produto: string;
  quantidade: number;
  peso_unitario_kg: number;
  peso_total_kg: number;
  unidade_medida: string;
  numero_caixa?: string;
  dimensoes_comprimento_cm?: number;
  dimensoes_largura_cm?: number;
  dimensoes_altura_cm?: number;
  volume_m3?: number;
  codigo_produto?: string;
  lote?: string;
  data_fabricacao?: string;
  data_validade?: string;
}

interface PackingListData {
  id?: number;
  importacao_01_1_proforma_invoice_id?: number;
  numero_packing_list: string;
  data_packing_list: string;
  remetente_nome: string;
  remetente_endereco: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  peso_total_liquido_kg: number;
  peso_total_bruto_kg: number;
  volume_total_m3?: number;
  quantidade_total_caixas?: number;
  observacoes?: string;
  status: string;
  containers?: PackingListContainer[];
  items?: PackingListItem[];
}

interface PackingListFormProps {
  initialData?: PackingListData;
  onSubmit: (data: PackingListData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PackingListForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: PackingListFormProps) {
  const [formData, setFormData] = useState<PackingListData>({
    numero_packing_list: '',
    data_packing_list: '',
    remetente_nome: '',
    remetente_endereco: '',
    destinatario_nome: '',
    destinatario_endereco: '',
    peso_total_liquido_kg: 0,
    peso_total_bruto_kg: 0,
    volume_total_m3: 0,
    quantidade_total_caixas: 0,
    observacoes: '',
    status: 'pending',
    containers: [],
    items: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'containers' | 'items'>('containers');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        containers: initialData.containers || [],
        items: initialData.items || []
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof PackingListData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContainerChange = (index: number, field: keyof PackingListContainer, value: any) => {
    const updatedContainers = [...(formData.containers || [])];
    updatedContainers[index] = {
      ...updatedContainers[index],
      [field]: value
    };

    // Calculate net weight if tare and gross weights are provided
    if (field === 'peso_bruto_kg' || field === 'peso_tara_kg') {
      const container = updatedContainers[index];
      if (container.peso_bruto_kg > 0 && container.peso_tara_kg > 0) {
        container.peso_liquido_kg = container.peso_bruto_kg - container.peso_tara_kg;
      }
    }

    setFormData(prev => ({
      ...prev,
      containers: updatedContainers
    }));

    calculateContainerTotals(updatedContainers);
  };

  const handleItemChange = (index: number, field: keyof PackingListItem, value: any) => {
    const updatedItems = [...(formData.items || [])];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Calculate total weight if quantity or unit weight changes
    if (field === 'quantidade' || field === 'peso_unitario_kg') {
      const item = updatedItems[index];
      item.peso_total_kg = item.quantidade * item.peso_unitario_kg;
    }

    // Calculate volume if dimensions change
    if (field === 'dimensoes_comprimento_cm' || field === 'dimensoes_largura_cm' || field === 'dimensoes_altura_cm') {
      const item = updatedItems[index];
      if (item.dimensoes_comprimento_cm && item.dimensoes_largura_cm && item.dimensoes_altura_cm) {
        item.volume_m3 = (item.dimensoes_comprimento_cm * item.dimensoes_largura_cm * item.dimensoes_altura_cm) / 1000000;
      }
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    calculateItemTotals(updatedItems);
  };

  const addContainer = () => {
    const newContainer: PackingListContainer = {
      numero_container: '',
      tipo_container: '20FT',
      peso_tara_kg: 0,
      peso_bruto_kg: 0,
      peso_liquido_kg: 0,
      dimensoes_comprimento_cm: 0,
      dimensoes_largura_cm: 0,
      dimensoes_altura_cm: 0,
      lacre_numero: '',
      observacoes: ''
    };

    setFormData(prev => ({
      ...prev,
      containers: [...(prev.containers || []), newContainer]
    }));
  };

  const removeContainer = (index: number) => {
    const updatedContainers = (formData.containers || []).filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      containers: updatedContainers
    }));
    calculateContainerTotals(updatedContainers);
  };

  const addItem = () => {
    const newItem: PackingListItem = {
      descricao_produto: '',
      quantidade: 1,
      peso_unitario_kg: 0,
      peso_total_kg: 0,
      unidade_medida: 'PCS',
      numero_caixa: '',
      dimensoes_comprimento_cm: 0,
      dimensoes_largura_cm: 0,
      dimensoes_altura_cm: 0,
      volume_m3: 0,
      codigo_produto: '',
      lote: '',
      data_fabricacao: '',
      data_validade: ''
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
    calculateItemTotals(updatedItems);
  };

  const calculateContainerTotals = (containers: PackingListContainer[]) => {
    const pesoLiquido = containers.reduce((sum, container) => sum + container.peso_liquido_kg, 0);
    const pesoBruto = containers.reduce((sum, container) => sum + container.peso_bruto_kg, 0);
    
    setFormData(prev => ({
      ...prev,
      peso_total_liquido_kg: pesoLiquido,
      peso_total_bruto_kg: pesoBruto
    }));
  };

  const calculateItemTotals = (items: PackingListItem[]) => {
    const volumeTotal = items.reduce((sum, item) => sum + (item.volume_m3 || 0), 0);
    const quantidadeCaixas = items.filter(item => item.numero_caixa).length;
    
    setFormData(prev => ({
      ...prev,
      volume_total_m3: volumeTotal,
      quantidade_total_caixas: quantidadeCaixas
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numero_packing_list.trim()) {
      newErrors.numero_packing_list = 'Número do packing list é obrigatório';
    }

    if (!formData.data_packing_list) {
      newErrors.data_packing_list = 'Data do packing list é obrigatória';
    }

    if (!formData.remetente_nome.trim()) {
      newErrors.remetente_nome = 'Nome do remetente é obrigatório';
    }

    if (!formData.destinatario_nome.trim()) {
      newErrors.destinatario_nome = 'Nome do destinatário é obrigatório';
    }

    // Validate containers
    formData.containers?.forEach((container, index) => {
      if (!container.numero_container.trim()) {
        newErrors[`container_${index}_numero`] = 'Número do container é obrigatório';
      }
      if (container.peso_bruto_kg <= 0) {
        newErrors[`container_${index}_peso_bruto`] = 'Peso bruto deve ser maior que zero';
      }
    });

    // Validate items
    formData.items?.forEach((item, index) => {
      if (!item.descricao_produto.trim()) {
        newErrors[`item_${index}_descricao`] = 'Descrição é obrigatória';
      }
      if (item.quantidade <= 0) {
        newErrors[`item_${index}_quantidade`] = 'Quantidade deve ser maior que zero';
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
      {/* Main Packing List Data */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dados do Packing List</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Número do Packing List *
            </label>
            <Input
              value={formData.numero_packing_list}
              onChange={(e) => handleInputChange('numero_packing_list', e.target.value)}
              placeholder="Ex: PL-2024-001"
              className={errors.numero_packing_list ? 'border-red-500' : ''}
            />
            {errors.numero_packing_list && (
              <p className="text-red-500 text-xs mt-1">{errors.numero_packing_list}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Data do Packing List *
            </label>
            <Input
              type="date"
              value={formData.data_packing_list}
              onChange={(e) => handleInputChange('data_packing_list', e.target.value)}
              className={errors.data_packing_list ? 'border-red-500' : ''}
            />
            {errors.data_packing_list && (
              <p className="text-red-500 text-xs mt-1">{errors.data_packing_list}</p>
            )}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome do Remetente *
            </label>
            <Input
              value={formData.remetente_nome}
              onChange={(e) => handleInputChange('remetente_nome', e.target.value)}
              placeholder="Nome da empresa remetente"
              className={errors.remetente_nome ? 'border-red-500' : ''}
            />
            {errors.remetente_nome && (
              <p className="text-red-500 text-xs mt-1">{errors.remetente_nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nome do Destinatário *
            </label>
            <Input
              value={formData.destinatario_nome}
              onChange={(e) => handleInputChange('destinatario_nome', e.target.value)}
              placeholder="Nome da empresa destinatária"
              className={errors.destinatario_nome ? 'border-red-500' : ''}
            />
            {errors.destinatario_nome && (
              <p className="text-red-500 text-xs mt-1">{errors.destinatario_nome}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Endereço do Remetente</label>
            <textarea
              value={formData.remetente_endereco}
              onChange={(e) => handleInputChange('remetente_endereco', e.target.value)}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Endereço completo do remetente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Endereço do Destinatário</label>
            <textarea
              value={formData.destinatario_endereco}
              onChange={(e) => handleInputChange('destinatario_endereco', e.target.value)}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Endereço completo do destinatário"
            />
          </div>
        </div>
      </Card>

      {/* Tabs for Containers and Items */}
      <Card className="p-6">
        <div className="flex border-b mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('containers')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'containers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Box className="w-4 h-4 inline mr-2" />
            Containers ({formData.containers?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 font-medium ml-4 ${
              activeTab === 'items'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Itens ({formData.items?.length || 0})
          </button>
        </div>

        {/* Containers Tab */}
        {activeTab === 'containers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Containers</h3>
              <Button type="button" onClick={addContainer} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Container
              </Button>
            </div>

            <div className="space-y-4">
              {formData.containers?.map((container, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Container {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContainer(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Número do Container *
                      </label>
                      <Input
                        value={container.numero_container}
                        onChange={(e) => handleContainerChange(index, 'numero_container', e.target.value)}
                        placeholder="Ex: ABCD1234567"
                        className={errors[`container_${index}_numero`] ? 'border-red-500' : ''}
                      />
                      {errors[`container_${index}_numero`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`container_${index}_numero`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo de Container</label>
                      <select
                        value={container.tipo_container}
                        onChange={(e) => handleContainerChange(index, 'tipo_container', e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="20FT">20FT - Standard</option>
                        <option value="40FT">40FT - Standard</option>
                        <option value="40HC">40HC - High Cube</option>
                        <option value="45FT">45FT - High Cube</option>
                        <option value="20RF">20RF - Refrigerated</option>
                        <option value="40RF">40RF - Refrigerated</option>
                        <option value="20OT">20OT - Open Top</option>
                        <option value="40OT">40OT - Open Top</option>
                        <option value="20FR">20FR - Flat Rack</option>
                        <option value="40FR">40FR - Flat Rack</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Número do Lacre</label>
                      <Input
                        value={container.lacre_numero || ''}
                        onChange={(e) => handleContainerChange(index, 'lacre_numero', e.target.value)}
                        placeholder="Número do lacre"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Peso Tara (kg)
                      </label>
                      <Input
                        type="number"
                        value={container.peso_tara_kg}
                        onChange={(e) => handleContainerChange(index, 'peso_tara_kg', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Peso Bruto (kg) *
                      </label>
                      <Input
                        type="number"
                        value={container.peso_bruto_kg}
                        onChange={(e) => handleContainerChange(index, 'peso_bruto_kg', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className={errors[`container_${index}_peso_bruto`] ? 'border-red-500' : ''}
                      />
                      {errors[`container_${index}_peso_bruto`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`container_${index}_peso_bruto`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Peso Líquido (kg)</label>
                      <Input
                        type="number"
                        value={container.peso_liquido_kg}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Comprimento (cm)</label>
                      <Input
                        type="number"
                        value={container.dimensoes_comprimento_cm || 0}
                        onChange={(e) => handleContainerChange(index, 'dimensoes_comprimento_cm', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Largura (cm)</label>
                      <Input
                        type="number"
                        value={container.dimensoes_largura_cm || 0}
                        onChange={(e) => handleContainerChange(index, 'dimensoes_largura_cm', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Altura (cm)</label>
                      <Input
                        type="number"
                        value={container.dimensoes_altura_cm || 0}
                        onChange={(e) => handleContainerChange(index, 'dimensoes_altura_cm', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Observações</label>
                    <textarea
                      value={container.observacoes || ''}
                      onChange={(e) => handleContainerChange(index, 'observacoes', e.target.value)}
                      className="w-full p-2 border rounded-md"
                      rows={2}
                      placeholder="Observações sobre o container"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Itens Embalados</h3>
              <Button type="button" onClick={addItem} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

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
                        placeholder="Descrição do produto"
                        className={errors[`item_${index}_descricao`] ? 'border-red-500' : ''}
                      />
                      {errors[`item_${index}_descricao`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_descricao`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Código do Produto</label>
                      <Input
                        value={item.codigo_produto || ''}
                        onChange={(e) => handleItemChange(index, 'codigo_produto', e.target.value)}
                        placeholder="SKU/Código"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Número da Caixa</label>
                      <Input
                        value={item.numero_caixa || ''}
                        onChange={(e) => handleItemChange(index, 'numero_caixa', e.target.value)}
                        placeholder="Ex: BOX-001"
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
                      <label className="block text-sm font-medium mb-1">Peso Unitário (kg)</label>
                      <Input
                        type="number"
                        value={item.peso_unitario_kg}
                        onChange={(e) => handleItemChange(index, 'peso_unitario_kg', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Peso Total (kg)</label>
                      <Input
                        type="number"
                        value={item.peso_total_kg}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Comprimento (cm)</label>
                      <Input
                        type="number"
                        value={item.dimensoes_comprimento_cm || 0}
                        onChange={(e) => handleItemChange(index, 'dimensoes_comprimento_cm', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Largura (cm)</label>
                      <Input
                        type="number"
                        value={item.dimensoes_largura_cm || 0}
                        onChange={(e) => handleItemChange(index, 'dimensoes_largura_cm', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Altura (cm)</label>
                      <Input
                        type="number"
                        value={item.dimensoes_altura_cm || 0}
                        onChange={(e) => handleItemChange(index, 'dimensoes_altura_cm', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Volume (m³)</label>
                      <Input
                        type="number"
                        value={item.volume_m3 || 0}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Lote</label>
                      <Input
                        value={item.lote || ''}
                        onChange={(e) => handleItemChange(index, 'lote', e.target.value)}
                        placeholder="Número do lote"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Data de Fabricação</label>
                      <Input
                        type="date"
                        value={item.data_fabricacao || ''}
                        onChange={(e) => handleItemChange(index, 'data_fabricacao', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Data de Validade</label>
                      <Input
                        type="date"
                        value={item.data_validade || ''}
                        onChange={(e) => handleItemChange(index, 'data_validade', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Totals Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo dos Totais</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Peso Líquido Total (kg)</label>
            <Input
              type="number"
              value={formData.peso_total_liquido_kg}
              readOnly
              className="bg-gray-50 font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Peso Bruto Total (kg)</label>
            <Input
              type="number"
              value={formData.peso_total_bruto_kg}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Volume Total (m³)</label>
            <Input
              type="number"
              value={formData.volume_total_m3 || 0}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantidade de Caixas</label>
            <Input
              type="number"
              value={formData.quantidade_total_caixas || 0}
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
          placeholder="Observações adicionais sobre o packing list"
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
              {initialData ? 'Atualizar' : 'Criar'} Packing List
            </>
          )}
        </Button>
      </div>
    </form>
  );
}