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
  Users,
  UserCheck,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Customer {
  id_cliente: number;
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
  data_nascimento?: string;
  limite_credito?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  total_pedidos?: number;
  valor_total_compras?: number;
  ultima_compra?: string;
}

interface CustomerFilters {
  search: string;
  tipo_pessoa: string;
  ativo: string;
  uf: string;
  cidade: string;
}

interface CustomerFormData {
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
  data_nascimento: string;
  limite_credito: number;
  observacoes: string;
  ativo: boolean;
}

export default function CustomerManager() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    tipo_pessoa: '',
    ativo: '',
    uf: '',
    cidade: ''
  });
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<string>('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const queryClient = useQueryClient();

  // Fetch customers with pagination and filters
  const { data: customersData, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters
      });
      
      const response = await fetch(`/api/cad/clients?${params}`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  });

  // Customer statistics
  const { data: statsData } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cad/clients/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      const response = await fetch('/api/cad/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      if (!response.ok) throw new Error('Failed to create customer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
      toast.success('Cliente criado com sucesso!');
      setShowCustomerForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar cliente');
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CustomerFormData> }) => {
      const response = await fetch(`/api/cad/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update customer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
      toast.success('Cliente atualizado com sucesso!');
      setShowCustomerForm(false);
      setEditingCustomer(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cliente');
    }
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/clients/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete customer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
      toast.success('Cliente removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover cliente');
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, customerIds, data }: { 
      operation: string; 
      customerIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/cad/clients/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, client_ids: customerIds, data })
      });
      if (!response.ok) throw new Error('Failed to execute bulk operation');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
      toast.success(`Operação ${variables.operation} executada com sucesso!`);
      setSelectedCustomers([]);
      setBulkOperation('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na operação em lote');
    }
  });

  // Form state
  const [formData, setFormData] = useState<CustomerFormData>({
    tipo_pessoa: 'F',
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
    data_nascimento: '',
    limite_credito: 0,
    observacoes: '',
    ativo: true
  });

  const resetForm = () => {
    setFormData({
      tipo_pessoa: 'F',
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
      data_nascimento: '',
      limite_credito: 0,
      observacoes: '',
      ativo: true
    });
  };

  // Format CPF/CNPJ
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

  // Format phone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  // Format CEP
  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCustomer) {
      updateCustomerMutation.mutate({
        id: editingCustomer.id_cliente,
        data: formData
      });
    } else {
      createCustomerMutation.mutate(formData);
    }
  };

  // Handle edit
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      tipo_pessoa: customer.tipo_pessoa,
      nome_razao_social: customer.nome_razao_social,
      nome_fantasia: customer.nome_fantasia || '',
      cpf_cnpj: customer.cpf_cnpj,
      rg_ie: customer.rg_ie || '',
      email: customer.email || '',
      telefone: customer.telefone || '',
      celular: customer.celular || '',
      endereco_logradouro: customer.endereco_logradouro || '',
      endereco_numero: customer.endereco_numero || '',
      endereco_complemento: customer.endereco_complemento || '',
      endereco_bairro: customer.endereco_bairro || '',
      endereco_cidade: customer.endereco_cidade || '',
      endereco_uf: customer.endereco_uf || '',
      endereco_cep: customer.endereco_cep || '',
      data_nascimento: customer.data_nascimento || '',
      limite_credito: customer.limite_credito || 0,
      observacoes: customer.observacoes || '',
      ativo: customer.ativo
    });
    setShowCustomerForm(true);
  };

  // Handle bulk operations
  const handleBulkOperation = () => {
    if (selectedCustomers.length === 0) {
      toast.error('Selecione ao menos um cliente');
      return;
    }

    if (!bulkOperation) {
      toast.error('Selecione uma operação');
      return;
    }

    bulkOperationMutation.mutate({
      operation: bulkOperation,
      customerIds: selectedCustomers
    });
  };

  // Export customers
  const handleExport = async () => {
    try {
      const response = await fetch('/api/cad/clients/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clientes.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Clientes exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar clientes');
    }
  };

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination;
  const stats = statsData?.data;

  if (error) {
    return (
      <Alert variant="destructive">
        Erro ao carregar clientes: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gerencie seu relacionamento com clientes</p>
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
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setShowCustomerForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Clientes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vendas Totais</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(stats.valor_total_vendas || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Novos este Mês</p>
                <p className="text-2xl font-bold text-blue-600">{stats.novos_mes}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
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
              <label className="block text-sm font-medium mb-1">UF</label>
              <select
                value={filters.uf}
                onChange={(e) => setFilters({ ...filters, uf: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="PR">Paraná</option>
                <option value="SC">Santa Catarina</option>
                <option value="BA">Bahia</option>
                <option value="GO">Goiás</option>
                <option value="ES">Espírito Santo</option>
                <option value="DF">Distrito Federal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <Input
                value={filters.cidade}
                onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                placeholder="Filtrar por cidade"
              />
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
              placeholder="Buscar clientes..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        
        {selectedCustomers.length > 0 && (
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
              <option value="export">Exportar Selecionados</option>
            </select>
            <Button 
              onClick={handleBulkOperation}
              disabled={!bulkOperation}
              variant="outline"
            >
              Executar ({selectedCustomers.length})
            </Button>
          </div>
        )}
      </div>

      {/* Customers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === customers.length && customers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers(customers.map((c: Customer) => c.id_cliente));
                      } else {
                        setSelectedCustomers([]);
                      }
                    }}
                  />
                </th>
                <th className="p-3 text-left font-medium">Cliente</th>
                <th className="p-3 text-left font-medium">Documento</th>
                <th className="p-3 text-left font-medium">Contato</th>
                <th className="p-3 text-left font-medium">Localização</th>
                <th className="p-3 text-left font-medium">Vendas</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                customers.map((customer: Customer) => (
                  <tr key={customer.id_cliente} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id_cliente)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomers([...selectedCustomers, customer.id_cliente]);
                          } else {
                            setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id_cliente));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium flex items-center">
                          {customer.tipo_pessoa === 'J' ? 
                            <Building className="w-4 h-4 mr-2 text-blue-500" /> : 
                            <Users className="w-4 h-4 mr-2 text-green-500" />
                          }
                          {customer.nome_razao_social}
                        </div>
                        {customer.nome_fantasia && customer.tipo_pessoa === 'J' && (
                          <div className="text-sm text-gray-500">{customer.nome_fantasia}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-sm">
                      {formatDocument(customer.cpf_cnpj, customer.tipo_pessoa)}
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {customer.email && (
                          <div className="flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                        {customer.telefone && (
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {formatPhone(customer.telefone)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {customer.endereco_cidade && customer.endereco_uf && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                            {customer.endereco_cidade}, {customer.endereco_uf}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{customer.total_pedidos || 0} pedidos</div>
                        {customer.valor_total_compras && (
                          <div className="text-green-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(customer.valor_total_compras)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        customer.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.ativo ? 'Ativo' : 'Inativo'}
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
                          <DropdownMenuItem onClick={() => handleEdit(customer)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Histórico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteCustomerMutation.mutate(customer.id_cliente)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, pagination.total)} de {pagination.total} clientes
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

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCustomerForm(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                >
                  ×
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Informações Básicas</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo de Pessoa *</label>
                      <select
                        value={formData.tipo_pessoa}
                        onChange={(e) => setFormData({ ...formData, tipo_pessoa: e.target.value as 'F' | 'J' })}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="F">Pessoa Física</option>
                        <option value="J">Pessoa Jurídica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {formData.tipo_pessoa === 'F' ? 'CPF' : 'CNPJ'} *
                      </label>
                      <Input
                        value={formData.cpf_cnpj}
                        onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                        required
                      />
                    </div>
                  </div>

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
                        <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
                        <Input
                          value={formData.nome_fantasia}
                          onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {formData.tipo_pessoa === 'F' ? 'RG' : 'Inscrição Estadual'}
                      </label>
                      <Input
                        value={formData.rg_ie}
                        onChange={(e) => setFormData({ ...formData, rg_ie: e.target.value })}
                      />
                    </div>
                    {formData.tipo_pessoa === 'F' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
                        <Input
                          type="date"
                          value={formData.data_nascimento}
                          onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Contato</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Telefone</label>
                      <Input
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Celular</label>
                      <Input
                        value={formData.celular}
                        onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Endereço</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Logradouro</label>
                      <Input
                        value={formData.endereco_logradouro}
                        onChange={(e) => setFormData({ ...formData, endereco_logradouro: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Número</label>
                      <Input
                        value={formData.endereco_numero}
                        onChange={(e) => setFormData({ ...formData, endereco_numero: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Complemento</label>
                      <Input
                        value={formData.endereco_complemento}
                        onChange={(e) => setFormData({ ...formData, endereco_complemento: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bairro</label>
                      <Input
                        value={formData.endereco_bairro}
                        onChange={(e) => setFormData({ ...formData, endereco_bairro: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cidade</label>
                      <Input
                        value={formData.endereco_cidade}
                        onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">UF</label>
                      <select
                        value={formData.endereco_uf}
                        onChange={(e) => setFormData({ ...formData, endereco_uf: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Selecione...</option>
                        <option value="AC">Acre</option>
                        <option value="AL">Alagoas</option>
                        <option value="AP">Amapá</option>
                        <option value="AM">Amazonas</option>
                        <option value="BA">Bahia</option>
                        <option value="CE">Ceará</option>
                        <option value="DF">Distrito Federal</option>
                        <option value="ES">Espírito Santo</option>
                        <option value="GO">Goiás</option>
                        <option value="MA">Maranhão</option>
                        <option value="MT">Mato Grosso</option>
                        <option value="MS">Mato Grosso do Sul</option>
                        <option value="MG">Minas Gerais</option>
                        <option value="PA">Pará</option>
                        <option value="PB">Paraíba</option>
                        <option value="PR">Paraná</option>
                        <option value="PE">Pernambuco</option>
                        <option value="PI">Piauí</option>
                        <option value="RJ">Rio de Janeiro</option>
                        <option value="RN">Rio Grande do Norte</option>
                        <option value="RS">Rio Grande do Sul</option>
                        <option value="RO">Rondônia</option>
                        <option value="RR">Roraima</option>
                        <option value="SC">Santa Catarina</option>
                        <option value="SP">São Paulo</option>
                        <option value="SE">Sergipe</option>
                        <option value="TO">Tocantins</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">CEP</label>
                      <Input
                        value={formData.endereco_cep}
                        onChange={(e) => setFormData({ ...formData, endereco_cep: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Informações Adicionais</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                    >
                      {showAdvancedFields ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                  
                  {showAdvancedFields && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Limite de Crédito</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.limite_credito}
                          onChange={(e) => setFormData({ ...formData, limite_credito: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Observações</label>
                        <textarea
                          value={formData.observacoes}
                          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                          className="w-full p-2 border rounded-md"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    />
                    <label htmlFor="ativo" className="text-sm font-medium">
                      Cliente Ativo
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCustomerForm(false);
                      setEditingCustomer(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  >
                    {createCustomerMutation.isPending || updateCustomerMutation.isPending ? (
                      <LoadingSpinner />
                    ) : editingCustomer ? (
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