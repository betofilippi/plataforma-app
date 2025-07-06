'use client'

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
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
  Building,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Globe,
  FileText,
  Shield,
  Users,
  AlertTriangle,
  Settings,
  TrendingUp,
  DollarSign,
  Package,
  Truck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Company {
  id_empresa: number;
  tipo_empresa: 'MATRIZ' | 'FILIAL';
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  email?: string;
  telefone?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
  site?: string;
  data_abertura?: string;
  regime_tributario?: 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  porte_empresa?: 'MEI' | 'ME' | 'EPP' | 'GRANDE';
  ativo: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  matriz_id?: number;
  total_funcionarios?: number;
  total_vendas?: number;
  total_produtos?: number;
  matriz?: {
    razao_social: string;
    nome_fantasia?: string;
  };
}

interface CompanyFilters {
  search: string;
  tipo_empresa: string;
  ativo: string;
  uf: string;
  cidade: string;
  regime_tributario: string;
  porte_empresa: string;
}

interface CompanyFormData {
  tipo_empresa: 'MATRIZ' | 'FILIAL';
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  email: string;
  telefone: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
  site: string;
  data_abertura: string;
  regime_tributario: 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  porte_empresa: 'MEI' | 'ME' | 'EPP' | 'GRANDE';
  matriz_id?: number;
  observacoes: string;
  ativo: boolean;
}

export default function CompanyManager() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<CompanyFilters>({
    search: '',
    tipo_empresa: '',
    ativo: '',
    uf: '',
    cidade: '',
    regime_tributario: '',
    porte_empresa: ''
  });
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const queryClient = useQueryClient();

  // Format CNPJ
  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  // Fetch companies
  const { data: companiesData, isLoading, error } = useQuery({
    queryKey: ['companies', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/cad/companies?${params}`);
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    }
  });

  // Fetch company statistics
  const { data: statsData } = useQuery({
    queryKey: ['company-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cad/companies/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Fetch matriz companies for select
  const { data: matrizCompanies } = useQuery({
    queryKey: ['matriz-companies'],
    queryFn: async () => {
      const response = await fetch('/api/cad/companies/select?tipo=MATRIZ');
      if (!response.ok) throw new Error('Failed to fetch matriz companies');
      return response.json();
    },
    enabled: showForm && (!editingCompany || editingCompany.tipo_empresa === 'FILIAL')
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: CompanyFormData) => {
      const response = await fetch('/api/cad/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create company');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      setShowForm(false);
      setEditingCompany(null);
      resetForm();
      toast.success('Empresa criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar empresa: ${error.message}`);
    }
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CompanyFormData> }) => {
      const response = await fetch(`/api/cad/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update company');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      setShowForm(false);
      setEditingCompany(null);
      resetForm();
      toast.success('Empresa atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar empresa: ${error.message}`);
    }
  });

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/companies/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete company');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      toast.success('Empresa removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover empresa: ${error.message}`);
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, companyIds, data }: { 
      operation: string; 
      companyIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/cad/companies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, companyIds, data })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to perform bulk operation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      setSelectedCompanies([]);
      toast.success('Operação executada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro na operação: ${error.message}`);
    }
  });

  // Form state
  const [formData, setFormData] = useState<CompanyFormData>({
    tipo_empresa: 'MATRIZ',
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    email: '',
    telefone: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_uf: '',
    endereco_cep: '',
    site: '',
    data_abertura: '',
    regime_tributario: 'SIMPLES',
    porte_empresa: 'ME',
    observacoes: '',
    ativo: true
  });

  const resetForm = () => {
    setFormData({
      tipo_empresa: 'MATRIZ',
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      email: '',
      telefone: '',
      endereco_logradouro: '',
      endereco_numero: '',
      endereco_complemento: '',
      endereco_bairro: '',
      endereco_cidade: '',
      endereco_uf: '',
      endereco_cep: '',
      site: '',
      data_abertura: '',
      regime_tributario: 'SIMPLES',
      porte_empresa: 'ME',
      observacoes: '',
      ativo: true
    });
  };

  // Load company data for editing
  useEffect(() => {
    if (editingCompany) {
      setFormData({
        tipo_empresa: editingCompany.tipo_empresa,
        razao_social: editingCompany.razao_social,
        nome_fantasia: editingCompany.nome_fantasia || '',
        cnpj: editingCompany.cnpj,
        inscricao_estadual: editingCompany.inscricao_estadual || '',
        inscricao_municipal: editingCompany.inscricao_municipal || '',
        email: editingCompany.email || '',
        telefone: editingCompany.telefone || '',
        endereco_logradouro: editingCompany.endereco_logradouro || '',
        endereco_numero: editingCompany.endereco_numero || '',
        endereco_complemento: editingCompany.endereco_complemento || '',
        endereco_bairro: editingCompany.endereco_bairro || '',
        endereco_cidade: editingCompany.endereco_cidade || '',
        endereco_uf: editingCompany.endereco_uf || '',
        endereco_cep: editingCompany.endereco_cep || '',
        site: editingCompany.site || '',
        data_abertura: editingCompany.data_abertura || '',
        regime_tributario: editingCompany.regime_tributario || 'SIMPLES',
        porte_empresa: editingCompany.porte_empresa || 'ME',
        matriz_id: editingCompany.matriz_id,
        observacoes: editingCompany.observacoes || '',
        ativo: editingCompany.ativo
      });
    }
  }, [editingCompany]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCompany) {
      updateCompanyMutation.mutate({ id: editingCompany.id_empresa, data: formData });
    } else {
      createCompanyMutation.mutate(formData);
    }
  };

  const handleDelete = (company: Company) => {
    if (confirm(`Tem certeza que deseja remover a empresa "${company.razao_social}"?`)) {
      deleteCompanyMutation.mutate(company.id_empresa);
    }
  };

  const handleBulkOperation = (operation: string) => {
    if (selectedCompanies.length === 0) {
      toast.error('Selecione pelo menos uma empresa');
      return;
    }

    let confirmMessage = '';
    switch (operation) {
      case 'activate':
        confirmMessage = `Ativar ${selectedCompanies.length} empresa(s)?`;
        break;
      case 'deactivate':
        confirmMessage = `Desativar ${selectedCompanies.length} empresa(s)?`;
        break;
      case 'delete':
        confirmMessage = `Remover ${selectedCompanies.length} empresa(s)?`;
        break;
      default:
        confirmMessage = `Executar operação em ${selectedCompanies.length} empresa(s)?`;
    }

    if (confirm(confirmMessage)) {
      bulkOperationMutation.mutate({ operation, companyIds: selectedCompanies });
    }
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
        formato: format
      });
      
      const response = await fetch(`/api/cad/companies/export?${params}`);
      
      if (format === 'csv') {
        const csvData = await response.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'empresas.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'empresas.json';
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      toast.success('Exportação realizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }
  };

  const toggleCompanySelection = (companyId: number) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const selectAllCompanies = () => {
    if (companiesData?.data) {
      const allIds = companiesData.data.map((company: Company) => company.id_empresa);
      setSelectedCompanies(selectedCompanies.length === allIds.length ? [] : allIds);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>Erro ao carregar empresas: {error.message}</span>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600">Gerenciamento de empresas do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <DropdownMenu>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <div className="w-48">
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => handleExport('csv')}
              >
                Exportar CSV
              </button>
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => handleExport('json')}
              >
                Exportar JSON
              </button>
            </div>
          </DropdownMenu>
          <Button
            onClick={() => {
              setEditingCompany(null);
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-semibold">{statsData.data.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-xl font-semibold">{statsData.data.ativas}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Matrizes</p>
                <p className="text-xl font-semibold">{statsData.data.matrizes}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Filiais</p>
                <p className="text-xl font-semibold">{statsData.data.filiais}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <Input
                placeholder="Nome, CNPJ..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={filters.tipo_empresa}
                onChange={(e) => setFilters(prev => ({ ...prev, tipo_empresa: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="MATRIZ">Matriz</option>
                <option value="FILIAL">Filial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={filters.ativo}
                onChange={(e) => setFilters(prev => ({ ...prev, ativo: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="true">Ativas</option>
                <option value="false">Inativas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UF
              </label>
              <Input
                placeholder="Ex: SP"
                value={filters.uf}
                onChange={(e) => setFilters(prev => ({ ...prev, uf: e.target.value }))}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedCompanies.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedCompanies.length} empresa(s) selecionada(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('activate')}
              >
                Ativar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('deactivate')}
              >
                Desativar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkOperation('delete')}
              >
                Remover
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Companies Table */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista de Empresas</h2>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCompanies.length === companiesData?.data?.length}
                onChange={selectAllCompanies}
                className="rounded border-gray-300"
              />
              <label className="text-sm text-gray-600">Selecionar todos</label>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedCompanies.length === companiesData?.data?.length}
                      onChange={selectAllCompanies}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Localização
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companiesData?.data?.map((company: Company) => (
                  <tr key={company.id_empresa} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company.id_empresa)}
                        onChange={() => toggleCompanySelection(company.id_empresa)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {company.razao_social}
                        </div>
                        {company.nome_fantasia && (
                          <div className="text-sm text-gray-500">
                            {company.nome_fantasia}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCNPJ(company.cnpj)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        company.tipo_empresa === 'MATRIZ' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {company.tipo_empresa}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {company.endereco_cidade}, {company.endereco_uf}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {company.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="truncate max-w-32">{company.email}</span>
                          </div>
                        )}
                        {company.telefone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {company.telefone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        company.ativo 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <DropdownMenu>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <div className="w-48">
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                              setEditingCompany(company);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                              navigator.clipboard.writeText(company.cnpj);
                              toast.success('CNPJ copiado!');
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Copiar CNPJ
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
                            onClick={() => handleDelete(company)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover
                          </button>
                        </div>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {companiesData?.pagination && (
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {companiesData.pagination.page} de {companiesData.pagination.totalPages} páginas
                ({companiesData.pagination.total} empresas)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === companiesData.pagination.totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Company Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="px-6 py-4 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Empresa *
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.tipo_empresa}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        tipo_empresa: e.target.value as 'MATRIZ' | 'FILIAL' 
                      }))}
                      required
                    >
                      <option value="MATRIZ">Matriz</option>
                      <option value="FILIAL">Filial</option>
                    </select>
                  </div>
                  
                  {formData.tipo_empresa === 'FILIAL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa Matriz
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.matriz_id || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          matriz_id: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                      >
                        <option value="">Selecione...</option>
                        {matrizCompanies?.data?.map((matriz: any) => (
                          <option key={matriz.value} value={matriz.value}>
                            {matriz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razão Social *
                    </label>
                    <Input
                      value={formData.razao_social}
                      onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Fantasia
                    </label>
                    <Input
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ *
                    </label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inscrição Estadual
                    </label>
                    <Input
                      value={formData.inscricao_estadual}
                      onChange={(e) => setFormData(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inscrição Municipal
                    </label>
                    <Input
                      value={formData.inscricao_municipal}
                      onChange={(e) => setFormData(prev => ({ ...prev, inscricao_municipal: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Informações de Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-mail
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <Input
                        value={formData.telefone}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <Input
                      value={formData.site}
                      onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="border-t pt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Logradouro
                      </label>
                      <Input
                        value={formData.endereco_logradouro}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco_logradouro: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número
                      </label>
                      <Input
                        value={formData.endereco_numero}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco_numero: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complemento
                      </label>
                      <Input
                        value={formData.endereco_complemento}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco_complemento: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bairro
                      </label>
                      <Input
                        value={formData.endereco_bairro}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco_bairro: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade
                      </label>
                      <Input
                        value={formData.endereco_cidade}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco_cidade: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UF
                      </label>
                      <Input
                        value={formData.endereco_uf}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco_uf: e.target.value }))}
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CEP
                      </label>
                      <Input
                        value={formData.endereco_cep}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco_cep: e.target.value }))}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div className="border-t pt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Detalhes da Empresa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Abertura
                      </label>
                      <Input
                        type="date"
                        value={formData.data_abertura}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_abertura: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Regime Tributário
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.regime_tributario}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          regime_tributario: e.target.value as 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'
                        }))}
                      >
                        <option value="SIMPLES">Simples Nacional</option>
                        <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                        <option value="LUCRO_REAL">Lucro Real</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Porte da Empresa
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.porte_empresa}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          porte_empresa: e.target.value as 'MEI' | 'ME' | 'EPP' | 'GRANDE'
                        }))}
                      >
                        <option value="MEI">MEI</option>
                        <option value="ME">Microempresa</option>
                        <option value="EPP">Empresa de Pequeno Porte</option>
                        <option value="GRANDE">Grande Empresa</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                    Empresa ativa
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCompany(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
                >
                  {createCompanyMutation.isPending || updateCompanyMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    editingCompany ? 'Atualizar' : 'Criar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}