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
  Truck,
  TrendingUp,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Package,
  Clock,
  Star,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Supplier {
  id_fornecedor: number;
  tipo_pessoa: 'F' | 'J';
  nome_razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj: string;
  rg_ie?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
  data_cadastro: string;
  prazo_pagamento?: number;
  forma_pagamento?: string;
  limite_credito?: number;
  observacoes?: string;
  avaliacao?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  total_pedidos?: number;
  valor_total_compras?: number;
  ultima_compra?: string;
  media_prazo_entrega?: number;
  percentual_pontualidade?: number;
}

interface SupplierFilters {
  search: string;
  tipo_pessoa: string;
  ativo: string;
  uf: string;
  cidade: string;
  forma_pagamento: string;
  avaliacao: string;
}

interface SupplierFormData {
  tipo_pessoa: 'F' | 'J';
  nome_razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  rg_ie: string;
  email: string;
  telefone: string;
  celular: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
  prazo_pagamento: number;
  forma_pagamento: string;
  limite_credito: number;
  observacoes: string;
  avaliacao: number;
  ativo: boolean;
}

export default function SupplierManager() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<SupplierFilters>({
    search: '',
    tipo_pessoa: '',
    ativo: '',
    uf: '',
    cidade: '',
    forma_pagamento: '',
    avaliacao: ''
  });
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<string>('');

  const queryClient = useQueryClient();

  // Fetch suppliers
  const { data: suppliersData, isLoading, error, refetch } = useQuery({
    queryKey: ['suppliers', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters
      });
      
      const response = await fetch(`/api/cad/suppliers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    }
  });

  // Supplier statistics
  const { data: statsData } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cad/suppliers/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: SupplierFormData) => {
      const response = await fetch('/api/cad/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData)
      });
      if (!response.ok) throw new Error('Failed to create supplier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
      toast.success('Fornecedor criado com sucesso!');
      setShowSupplierForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar fornecedor');
    }
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SupplierFormData> }) => {
      const response = await fetch(`/api/cad/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update supplier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
      toast.success('Fornecedor atualizado com sucesso!');
      setShowSupplierForm(false);
      setEditingSupplier(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar fornecedor');
    }
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/suppliers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete supplier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
      toast.success('Fornecedor removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover fornecedor');
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, supplierIds, data }: { 
      operation: string; 
      supplierIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/cad/suppliers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, supplier_ids: supplierIds, data })
      });
      if (!response.ok) throw new Error('Failed to execute bulk operation');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
      toast.success(`Operação ${variables.operation} executada com sucesso!`);
      setSelectedSuppliers([]);
      setBulkOperation('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na operação em lote');
    }
  });

  // Form state
  const [formData, setFormData] = useState<SupplierFormData>({
    tipo_pessoa: 'J',
    nome_razao_social: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    rg_ie: '',
    email: '',
    telefone: '',
    celular: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_uf: '',
    endereco_cep: '',
    prazo_pagamento: 30,
    forma_pagamento: '',
    limite_credito: 0,
    observacoes: '',
    avaliacao: 5,
    ativo: true
  });

  const resetForm = () => {
    setFormData({
      tipo_pessoa: 'J',
      nome_razao_social: '',
      nome_fantasia: '',
      cpf_cnpj: '',
      rg_ie: '',
      email: '',
      telefone: '',
      celular: '',
      endereco_logradouro: '',
      endereco_numero: '',
      endereco_complemento: '',
      endereco_bairro: '',
      endereco_cidade: '',
      endereco_uf: '',
      endereco_cep: '',
      prazo_pagamento: 30,
      forma_pagamento: '',
      limite_credito: 0,
      observacoes: '',
      avaliacao: 5,
      ativo: true
    });
  };

  // Format document based on person type
  const formatDocument = (value: string, type: 'F' | 'J') => {
    const numbers = value.replace(/\D/g, '');
    if (type === 'F') {
      // CPF: 000.000.000-00
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      updateSupplierMutation.mutate({
        id: editingSupplier.id_fornecedor,
        data: formData
      });
    } else {
      createSupplierMutation.mutate(formData);
    }
  };

  // Handle edit
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      tipo_pessoa: supplier.tipo_pessoa,
      nome_razao_social: supplier.nome_razao_social,
      nome_fantasia: supplier.nome_fantasia || '',
      cpf_cnpj: supplier.cpf_cnpj,
      rg_ie: supplier.rg_ie || '',
      email: supplier.email || '',
      telefone: supplier.telefone || '',
      celular: supplier.celular || '',
      endereco_logradouro: supplier.endereco_logradouro || '',
      endereco_numero: supplier.endereco_numero || '',
      endereco_complemento: supplier.endereco_complemento || '',
      endereco_bairro: supplier.endereco_bairro || '',
      endereco_cidade: supplier.endereco_cidade || '',
      endereco_uf: supplier.endereco_uf || '',
      endereco_cep: supplier.endereco_cep || '',
      prazo_pagamento: supplier.prazo_pagamento || 30,
      forma_pagamento: supplier.forma_pagamento || '',
      limite_credito: supplier.limite_credito || 0,
      observacoes: supplier.observacoes || '',
      avaliacao: supplier.avaliacao || 5,
      ativo: supplier.ativo
    });
    setShowSupplierForm(true);
  };

  // Handle bulk operations
  const handleBulkOperation = () => {
    if (selectedSuppliers.length === 0) {
      toast.error('Selecione ao menos um fornecedor');
      return;
    }

    if (!bulkOperation) {
      toast.error('Selecione uma operação');
      return;
    }

    bulkOperationMutation.mutate({
      operation: bulkOperation,
      supplierIds: selectedSuppliers
    });
  };

  // Export suppliers
  const handleExport = async () => {
    try {
      const response = await fetch('/api/cad/suppliers/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fornecedores_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('Exportação realizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar fornecedores');
    }
  };

  // Render rating stars
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating})</span>
      </div>
    );
  };

  const suppliers = suppliersData?.data || [];
  const pagination = suppliersData?.pagination;
  const stats = statsData?.data;

  if (error) {
    return (
      <Alert variant="destructive">
        Erro ao carregar fornecedores: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Gerencie fornecedores e parceiros comerciais</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowSupplierForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Fornecedores</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fornecedores Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total Compras</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(stats.valor_total_compras || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avaliação Média</p>
                <p className="text-2xl font-bold text-orange-600">{stats.avaliacao_media?.toFixed(1) || '0.0'}</p>
              </div>
              <Star className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Pessoa</label>
              <select
                value={filters.tipo_pessoa}
                onChange={(e) => setFilters({ ...filters, tipo_pessoa: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos</option>
                <option value="F">Pessoa Física</option>
                <option value="J">Pessoa Jurídica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.ativo}
                onChange={(e) => setFilters({ ...filters, ativo: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
              <select
                value={filters.forma_pagamento}
                onChange={(e) => setFilters({ ...filters, forma_pagamento: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas</option>
                <option value="A vista">À vista</option>
                <option value="30 dias">30 dias</option>
                <option value="60 dias">60 dias</option>
                <option value="90 dias">90 dias</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Avaliação Mínima</label>
              <select
                value={filters.avaliacao}
                onChange={(e) => setFilters({ ...filters, avaliacao: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas</option>
                <option value="5">5 estrelas</option>
                <option value="4">4+ estrelas</option>
                <option value="3">3+ estrelas</option>
                <option value="2">2+ estrelas</option>
                <option value="1">1+ estrelas</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Bulk Operations */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar fornecedores..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        
        {selectedSuppliers.length > 0 && (
          <div className="flex gap-2">
            <select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Operações em lote</option>
              <option value="activate">Ativar</option>
              <option value="deactivate">Desativar</option>
              <option value="delete">Excluir</option>
              <option value="export">Exportar selecionados</option>
            </select>
            <Button 
              onClick={handleBulkOperation}
              disabled={!bulkOperation}
              variant="outline"
            >
              Executar ({selectedSuppliers.length})
            </Button>
          </div>
        )}
      </div>

      {/* Suppliers Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum fornecedor encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.length === suppliers.length && suppliers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSuppliers(suppliers.map((s: Supplier) => s.id_fornecedor));
                        } else {
                          setSelectedSuppliers([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-3 text-left font-medium">Fornecedor</th>
                  <th className="p-3 text-left font-medium">Documento</th>
                  <th className="p-3 text-left font-medium">Contato</th>
                  <th className="p-3 text-left font-medium">Pagamento</th>
                  <th className="p-3 text-left font-medium">Avaliação</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier: Supplier) => (
                  <tr key={supplier.id_fornecedor} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(supplier.id_fornecedor)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSuppliers([...selectedSuppliers, supplier.id_fornecedor]);
                          } else {
                            setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier.id_fornecedor));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{supplier.nome_razao_social}</div>
                        {supplier.nome_fantasia && (
                          <div className="text-sm text-gray-600">{supplier.nome_fantasia}</div>
                        )}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            supplier.tipo_pessoa === 'F' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {supplier.tipo_pessoa === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-sm">{supplier.cpf_cnpj}</div>
                      {supplier.rg_ie && (
                        <div className="text-xs text-gray-600">{supplier.rg_ie}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.telefone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {supplier.telefone}
                          </div>
                        )}
                        {supplier.endereco_cidade && supplier.endereco_uf && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {supplier.endereco_cidade}, {supplier.endereco_uf}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {supplier.forma_pagamento || 'Não informado'}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {supplier.prazo_pagamento || 0} dias
                        </div>
                        {supplier.limite_credito && supplier.limite_credito > 0 && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(supplier.limite_credito)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {renderRating(supplier.avaliacao || 0)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        supplier.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Package className="w-4 h-4 mr-2" />
                            Ver Produtos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteSupplierMutation.mutate(supplier.id_fornecedor)}
                            className="text-red-600"
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
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, pagination.total)} de {pagination.total} fornecedores
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowSupplierForm(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
                >
                  ×
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Person Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo de Pessoa *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="F"
                        checked={formData.tipo_pessoa === 'F'}
                        onChange={(e) => setFormData({ ...formData, tipo_pessoa: e.target.value as 'F' | 'J' })}
                        className="mr-2"
                      />
                      Pessoa Física
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="J"
                        checked={formData.tipo_pessoa === 'J'}
                        onChange={(e) => setFormData({ ...formData, tipo_pessoa: e.target.value as 'F' | 'J' })}
                        className="mr-2"
                      />
                      Pessoa Jurídica
                    </label>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {formData.tipo_pessoa === 'F' ? 'Nome Completo' : 'Razão Social'} *
                    </label>
                    <Input
                      value={formData.nome_razao_social}
                      onChange={(e) => setFormData({ ...formData, nome_razao_social: e.target.value })}
                      required
                    />
                  </div>
                  {formData.tipo_pessoa === 'J' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nome Fantasia
                      </label>
                      <Input
                        value={formData.nome_fantasia}
                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {formData.tipo_pessoa === 'F' ? 'CPF' : 'CNPJ'} *
                    </label>
                    <Input
                      value={formData.cpf_cnpj}
                      onChange={(e) => {
                        const formatted = formatDocument(e.target.value, formData.tipo_pessoa);
                        setFormData({ ...formData, cpf_cnpj: formatted });
                      }}
                      placeholder={formData.tipo_pessoa === 'F' ? '000.000.000-00' : '00.000.000/0000-00'}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {formData.tipo_pessoa === 'F' ? 'RG' : 'Inscrição Estadual'}
                    </label>
                    <Input
                      value={formData.rg_ie}
                      onChange={(e) => setFormData({ ...formData, rg_ie: e.target.value })}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      E-mail
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Telefone
                    </label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Celular
                    </label>
                    <Input
                      value={formData.celular}
                      onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Logradouro
                      </label>
                      <Input
                        value={formData.endereco_logradouro}
                        onChange={(e) => setFormData({ ...formData, endereco_logradouro: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Número
                      </label>
                      <Input
                        value={formData.endereco_numero}
                        onChange={(e) => setFormData({ ...formData, endereco_numero: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        CEP
                      </label>
                      <Input
                        value={formData.endereco_cep}
                        onChange={(e) => setFormData({ ...formData, endereco_cep: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Complemento
                      </label>
                      <Input
                        value={formData.endereco_complemento}
                        onChange={(e) => setFormData({ ...formData, endereco_complemento: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bairro
                      </label>
                      <Input
                        value={formData.endereco_bairro}
                        onChange={(e) => setFormData({ ...formData, endereco_bairro: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Cidade
                      </label>
                      <Input
                        value={formData.endereco_cidade}
                        onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        UF
                      </label>
                      <select
                        value={formData.endereco_uf}
                        onChange={(e) => setFormData({ ...formData, endereco_uf: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Selecione</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Condições de Pagamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Forma de Pagamento
                      </label>
                      <select
                        value={formData.forma_pagamento}
                        onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Selecione</option>
                        <option value="A vista">À vista</option>
                        <option value="30 dias">30 dias</option>
                        <option value="60 dias">60 dias</option>
                        <option value="90 dias">90 dias</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Cartão">Cartão</option>
                        <option value="PIX">PIX</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Prazo de Pagamento (dias)
                      </label>
                      <Input
                        type="number"
                        value={formData.prazo_pagamento}
                        onChange={(e) => setFormData({ ...formData, prazo_pagamento: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Limite de Crédito
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.limite_credito}
                        onChange={(e) => setFormData({ ...formData, limite_credito: parseFloat(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Rating and Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Avaliação
                    </label>
                    <select
                      value={formData.avaliacao}
                      onChange={(e) => setFormData({ ...formData, avaliacao: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value={1}>1 estrela</option>
                      <option value={2}>2 estrelas</option>
                      <option value={3}>3 estrelas</option>
                      <option value={4}>4 estrelas</option>
                      <option value={5}>5 estrelas</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    />
                    <label htmlFor="ativo" className="text-sm font-medium">
                      Fornecedor Ativo
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows={4}
                    placeholder="Informações adicionais sobre o fornecedor..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowSupplierForm(false);
                      setEditingSupplier(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                  >
                    {createSupplierMutation.isPending || updateSupplierMutation.isPending ? (
                      <LoadingSpinner />
                    ) : editingSupplier ? (
                      'Atualizar'
                    ) : (
                      'Criar'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}