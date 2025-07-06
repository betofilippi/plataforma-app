'use client'

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/DropdownMenu';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Copy,
  MoreHorizontal,
  DollarSign,
  Calendar,
  Building,
  Package,
  TrendingUp,
  Clock,
  Percent,
  CheckCircle,
  XCircle,
  Tag,
  FileSpreadsheet,
  AlertCircle,
  Star,
  ArrowUpDown,
  Eye,
  ShoppingCart,
  Target,
  Calculator
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PriceList {
  id_lista_precos: number;
  nome: string;
  descricao?: string;
  tipo_lista: 'VENDA' | 'COMPRA' | 'PROMOCIONAL' | 'ATACADO' | 'VAREJO';
  data_inicio?: string;
  data_fim?: string;
  id_empresa: number;
  margem_padrao: number;
  permite_desconto: boolean;
  desconto_maximo: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa_nome?: string;
  total_itens?: number;
  itens?: PriceListItem[];
}

interface PriceListItem {
  id_item: number;
  id_produto: number;
  preco_venda: number;
  preco_promocional?: number;
  data_inicio_promocao?: string;
  data_fim_promocao?: string;
  margem_percentual: number;
  desconto_maximo: number;
  ativo: boolean;
  codigo?: string;
  produto_descricao?: string;
  unidade_sigla?: string;
}

interface PriceListFilters {
  search: string;
  ativo: string;
  tipo_lista: string;
  id_empresa: string;
}

interface PriceListFormData {
  nome: string;
  descricao: string;
  tipo_lista: 'VENDA' | 'COMPRA' | 'PROMOCIONAL' | 'ATACADO' | 'VAREJO';
  data_inicio: string;
  data_fim: string;
  id_empresa: number;
  margem_padrao: number;
  permite_desconto: boolean;
  desconto_maximo: number;
  itens: PriceListItemFormData[];
}

interface PriceListItemFormData {
  id_produto: number;
  preco_venda: number;
  preco_promocional: number;
  data_inicio_promocao: string;
  data_fim_promocao: string;
  margem_percentual: number;
  desconto_maximo: number;
  ativo: boolean;
}

interface PriceCalculation {
  id_produto: number;
  codigo: string;
  descricao: string;
  preco_unitario: number;
  preco_total: number;
  quantidade: number;
  margem_percentual: number;
  desconto_maximo: number;
  permite_desconto: boolean;
  em_promocao: boolean;
  preco_promocional?: number;
}

const PriceListManager: React.FC = () => {
  // Estados
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(null);
  const [selectedPriceLists, setSelectedPriceLists] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [filters, setFilters] = useState<PriceListFilters>({
    search: '',
    ativo: '',
    tipo_lista: '',
    id_empresa: ''
  });

  const [formData, setFormData] = useState<PriceListFormData>({
    nome: '',
    descricao: '',
    tipo_lista: 'VENDA',
    data_inicio: '',
    data_fim: '',
    id_empresa: 1,
    margem_padrao: 0,
    permite_desconto: true,
    desconto_maximo: 0,
    itens: []
  });

  const [calculatorProducts, setCalculatorProducts] = useState<{ id_produto: number; quantidade: number }[]>([]);
  const [calculationResults, setCalculationResults] = useState<PriceCalculation[]>([]);

  const queryClient = useQueryClient();

  // Queries
  const { data: priceListsData, isLoading, error } = useQuery({
    queryKey: ['priceLists', currentPage, filters, sortField, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        sort: sortField,
        order: sortOrder,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/cad/price-lists?${params}`);
      if (!response.ok) throw new Error('Falha ao carregar listas de preços');
      return response.json();
    }
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await fetch('/api/cad/companies/select');
      if (!response.ok) throw new Error('Falha ao carregar empresas');
      return response.json();
    }
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/cad/products/select');
      if (!response.ok) throw new Error('Falha ao carregar produtos');
      return response.json();
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['priceListStats'],
    queryFn: async () => {
      const response = await fetch('/api/cad/price-lists/stats');
      if (!response.ok) throw new Error('Falha ao carregar estatísticas');
      return response.json();
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: PriceListFormData) => {
      const response = await fetch('/api/cad/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar lista de preços');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      queryClient.invalidateQueries({ queryKey: ['priceListStats'] });
      setIsModalOpen(false);
      resetForm();
      toast.success('Lista de preços criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PriceListFormData> }) => {
      const response = await fetch(`/api/cad/price-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar lista de preços');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      queryClient.invalidateQueries({ queryKey: ['priceListStats'] });
      setIsModalOpen(false);
      setEditingPriceList(null);
      resetForm();
      toast.success('Lista de preços atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/price-lists/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao remover lista de preços');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      queryClient.invalidateQueries({ queryKey: ['priceListStats'] });
      toast.success('Lista de preços removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/price-lists/${id}/toggle-status`, {
        method: 'PATCH'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao alterar status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      queryClient.invalidateQueries({ queryKey: ['priceListStats'] });
      toast.success('Status alterado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ operation, priceListIds, data }: { 
      operation: string; 
      priceListIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/cad/price-lists/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, priceListIds, data })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro na operação em lote');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      queryClient.invalidateQueries({ queryKey: ['priceListStats'] });
      setSelectedPriceLists([]);
      setBulkAction('');
      toast.success('Operação em lote executada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const calculatePricesMutation = useMutation({
    mutationFn: async ({ listId, produtos }: { listId: number; produtos: any[] }) => {
      const response = await fetch(`/api/cad/price-lists/${listId}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao calcular preços');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCalculationResults(data.data);
      toast.success('Preços calculados com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo_lista: 'VENDA',
      data_inicio: '',
      data_fim: '',
      id_empresa: 1,
      margem_padrao: 0,
      permite_desconto: true,
      desconto_maximo: 0,
      itens: []
    });
  };

  const handleEdit = (priceList: PriceList) => {
    setEditingPriceList(priceList);
    setFormData({
      nome: priceList.nome,
      descricao: priceList.descricao || '',
      tipo_lista: priceList.tipo_lista,
      data_inicio: priceList.data_inicio ? priceList.data_inicio.split('T')[0] : '',
      data_fim: priceList.data_fim ? priceList.data_fim.split('T')[0] : '',
      id_empresa: priceList.id_empresa,
      margem_padrao: priceList.margem_padrao,
      permite_desconto: priceList.permite_desconto,
      desconto_maximo: priceList.desconto_maximo,
      itens: priceList.itens?.map(item => ({
        id_produto: item.id_produto,
        preco_venda: item.preco_venda,
        preco_promocional: item.preco_promocional || 0,
        data_inicio_promocao: item.data_inicio_promocao ? item.data_inicio_promocao.split('T')[0] : '',
        data_fim_promocao: item.data_fim_promocao ? item.data_fim_promocao.split('T')[0] : '',
        margem_percentual: item.margem_percentual,
        desconto_maximo: item.desconto_maximo,
        ativo: item.ativo
      })) || []
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPriceList) {
      updateMutation.mutate({ id: editingPriceList.id_lista_precos, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedPriceLists.length === 0) return;

    let data = {};
    
    if (bulkAction === 'set_dates') {
      const dataInicio = prompt('Data de início (YYYY-MM-DD):');
      const dataFim = prompt('Data de fim (YYYY-MM-DD):');
      if (dataInicio || dataFim) {
        data = { data_inicio: dataInicio, data_fim: dataFim };
      } else {
        return;
      }
    } else if (bulkAction === 'apply_margin') {
      const margem = prompt('Margem percentual:');
      if (margem && !isNaN(Number(margem))) {
        data = { margem_percentual: Number(margem) };
      } else {
        toast.error('Margem inválida');
        return;
      }
    }

    bulkMutation.mutate({ operation: bulkAction, priceListIds: selectedPriceLists, data });
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const params = new URLSearchParams({
        formato: format,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/cad/price-lists/export?${params}`);
      
      if (format === 'csv') {
        const csvData = await response.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'listas-precos.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'listas-precos.json';
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (ativo: boolean) => {
    return ativo ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ativo
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Inativo
      </span>
    );
  };

  const getTypeBadge = (tipo: string) => {
    const colors = {
      VENDA: 'bg-blue-100 text-blue-800',
      COMPRA: 'bg-purple-100 text-purple-800',
      PROMOCIONAL: 'bg-yellow-100 text-yellow-800',
      ATACADO: 'bg-green-100 text-green-800',
      VAREJO: 'bg-pink-100 text-pink-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[tipo as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        <Tag className="w-3 h-3 mr-1" />
        {tipo}
      </span>
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <Alert variant="destructive">Erro ao carregar listas de preços</Alert>;

  const priceLists = priceListsData?.data || [];
  const pagination = priceListsData?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Listas de Preços</h1>
          <p className="text-sm text-gray-600">Gerencie listas de preços e tabelas de valores</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Lista
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Listas</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.data.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ativas</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.data.ativas}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Próximas a Expirar</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.data.proximas_expirar?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inativas</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.data.inativas}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filtros e Ações */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar listas..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>

          <select
            value={filters.ativo}
            onChange={(e) => setFilters({ ...filters, ativo: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>

          <select
            value={filters.tipo_lista}
            onChange={(e) => setFilters({ ...filters, tipo_lista: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="VENDA">Venda</option>
            <option value="COMPRA">Compra</option>
            <option value="PROMOCIONAL">Promocional</option>
            <option value="ATACADO">Atacado</option>
            <option value="VAREJO">Varejo</option>
          </select>

          <select
            value={filters.id_empresa}
            onChange={(e) => setFilters({ ...filters, id_empresa: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todas as empresas</option>
            {companies?.data?.map((company: any) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Operações em lote */}
        {selectedPriceLists.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-600">
              {selectedPriceLists.length} lista(s) selecionada(s)
            </span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            >
              <option value="">Selecione uma ação</option>
              <option value="activate">Ativar</option>
              <option value="deactivate">Desativar</option>
              <option value="set_dates">Definir Datas</option>
              <option value="apply_margin">Aplicar Margem</option>
              <option value="delete">Excluir</option>
            </select>
            <Button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              size="sm"
            >
              Executar
            </Button>
          </div>
        )}
      </Card>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPriceLists.length === priceLists.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPriceLists(priceLists.map((p: PriceList) => p.id_lista_precos));
                      } else {
                        setSelectedPriceLists([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('nome')}
                >
                  <div className="flex items-center">
                    Nome
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Itens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {priceLists.map((priceList: PriceList) => (
                <tr key={priceList.id_lista_precos} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPriceLists.includes(priceList.id_lista_precos)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPriceLists([...selectedPriceLists, priceList.id_lista_precos]);
                        } else {
                          setSelectedPriceLists(selectedPriceLists.filter(id => id !== priceList.id_lista_precos));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{priceList.nome}</div>
                      {priceList.descricao && (
                        <div className="text-sm text-gray-500">{priceList.descricao}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTypeBadge(priceList.tipo_lista)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{priceList.empresa_nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {priceList.data_inicio && priceList.data_fim ? (
                        <>
                          <div>{formatDate(priceList.data_inicio)}</div>
                          <div className="text-gray-500">até {formatDate(priceList.data_fim)}</div>
                        </>
                      ) : (
                        <span className="text-gray-500">Sem período definido</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Percent className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{priceList.margem_padrao}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{priceList.total_itens || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(priceList.ativo)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          // Navigate to price list details
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(priceList)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingPriceList(priceList);
                          setIsCalculatorModalOpen(true);
                        }}>
                          <Calculator className="w-4 h-4 mr-2" />
                          Calcular Preços
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(priceList.id_lista_precos)}>
                          {priceList.ativo ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          {priceList.ativo ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const duplicatedData = {
                            ...priceList,
                            nome: `${priceList.nome} (Cópia)`,
                            id_lista_precos: undefined
                          };
                          createMutation.mutate(duplicatedData as any);
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir esta lista de preços?')) {
                              deleteMutation.mutate(priceList.id_lista_precos);
                            }
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} resultados
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                  size="sm"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Formulário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingPriceList ? 'Editar Lista de Preços' : 'Nova Lista de Preços'}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPriceList(null);
                  resetForm();
                }}
              >
                ×
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <Input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo_lista}
                    onChange={(e) => setFormData({ ...formData, tipo_lista: e.target.value as any })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="VENDA">Venda</option>
                    <option value="COMPRA">Compra</option>
                    <option value="PROMOCIONAL">Promocional</option>
                    <option value="ATACADO">Atacado</option>
                    <option value="VAREJO">Varejo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa *
                  </label>
                  <select
                    value={formData.id_empresa}
                    onChange={(e) => setFormData({ ...formData, id_empresa: Number(e.target.value) })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    {companies?.data?.map((company: any) => (
                      <option key={company.value} value={company.value}>
                        {company.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margem Padrão (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.margem_padrao}
                    onChange={(e) => setFormData({ ...formData, margem_padrao: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início
                  </label>
                  <Input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Fim
                  </label>
                  <Input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permite_desconto}
                      onChange={(e) => setFormData({ ...formData, permite_desconto: e.target.checked })}
                      className="rounded border-gray-300 mr-2"
                    />
                    Permite Desconto
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desconto Máximo (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.desconto_maximo}
                    onChange={(e) => setFormData({ ...formData, desconto_maximo: Number(e.target.value) })}
                    disabled={!formData.permite_desconto}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPriceList(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Calculadora de Preços */}
      {isCalculatorModalOpen && editingPriceList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Calculadora de Preços - {editingPriceList.nome}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCalculatorModalOpen(false);
                  setCalculatorProducts([]);
                  setCalculationResults([]);
                }}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              {/* Seleção de Produtos */}
              <div>
                <h3 className="text-lg font-medium mb-2">Selecionar Produtos</h3>
                <div className="space-y-2">
                  {calculatorProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <select
                        value={product.id_produto}
                        onChange={(e) => {
                          const newProducts = [...calculatorProducts];
                          newProducts[index].id_produto = Number(e.target.value);
                          setCalculatorProducts(newProducts);
                        }}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="">Selecione um produto</option>
                        {products?.data?.map((prod: any) => (
                          <option key={prod.value} value={prod.value}>
                            {prod.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        placeholder="Quantidade"
                        value={product.quantidade}
                        onChange={(e) => {
                          const newProducts = [...calculatorProducts];
                          newProducts[index].quantidade = Number(e.target.value);
                          setCalculatorProducts(newProducts);
                        }}
                        className="w-32"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCalculatorProducts(calculatorProducts.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setCalculatorProducts([...calculatorProducts, { id_produto: 0, quantidade: 1 }])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>
              </div>

              {/* Botão Calcular */}
              <div>
                <Button
                  onClick={() => {
                    const validProducts = calculatorProducts.filter(p => p.id_produto > 0);
                    if (validProducts.length > 0) {
                      calculatePricesMutation.mutate({
                        listId: editingPriceList.id_lista_precos,
                        produtos: validProducts
                      });
                    }
                  }}
                  disabled={calculatePricesMutation.isPending || calculatorProducts.filter(p => p.id_produto > 0).length === 0}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  {calculatePricesMutation.isPending ? 'Calculando...' : 'Calcular Preços'}
                </Button>
              </div>

              {/* Resultados */}
              {calculationResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Resultados</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Produto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Quantidade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Preço Unitário
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Preço Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Margem
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Promoção
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {calculationResults.map((result, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{result.codigo}</div>
                                <div className="text-sm text-gray-500">{result.descricao}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {result.quantidade}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatCurrency(result.preco_unitario)}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {formatCurrency(result.preco_total)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {result.margem_percentual}%
                            </td>
                            <td className="px-6 py-4">
                              {result.em_promocao ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Star className="w-3 h-3 mr-1" />
                                  Promoção
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCalculatorModalOpen(false);
                  setCalculatorProducts([]);
                  setCalculationResults([]);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceListManager;