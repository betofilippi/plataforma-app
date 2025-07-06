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
  Users,
  UserCheck,
  Key,
  Shield,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Eye,
  EyeOff,
  UserPlus,
  Settings,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface User {
  id_usuario: number;
  nome: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  tipo_usuario: 'ADMIN' | 'GERENTE' | 'OPERADOR' | 'VENDEDOR' | 'COMPRADOR';
  nivel_acesso: number;
  ativo: boolean;
  ultimo_login?: string;
  data_criacao: string;
  data_expiracao?: string;
  tentativas_login: number;
  bloqueado: boolean;
  created_at: string;
  updated_at: string;
  empresas_acesso?: number[];
  permissoes?: string[];
}

interface UserFilters {
  search: string;
  tipo_usuario: string;
  ativo: string;
  departamento: string;
  bloqueado: string;
  nivel_acesso: string;
}

interface UserFormData {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  departamento: string;
  tipo_usuario: 'ADMIN' | 'GERENTE' | 'OPERADOR' | 'VENDEDOR' | 'COMPRADOR';
  nivel_acesso: number;
  senha?: string;
  confirmar_senha?: string;
  data_expiracao?: string;
  empresas_acesso: number[];
  permissoes: string[];
  ativo: boolean;
}

export default function UserManager() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    tipo_usuario: '',
    ativo: '',
    departamento: '',
    bloqueado: '',
    nivel_acesso: ''
  });
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    departamento: '',
    tipo_usuario: 'OPERADOR',
    nivel_acesso: 1,
    senha: '',
    confirmar_senha: '',
    data_expiracao: '',
    empresas_acesso: [],
    permissoes: [],
    ativo: true
  });

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/cad/users?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      return response.json();
    }
  });

  // Fetch user statistics
  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cad/users/stats');
      if (!response.ok) throw new Error('Erro ao carregar estatísticas');
      return response.json();
    }
  });

  // Fetch companies for access control
  const { data: companiesData } = useQuery({
    queryKey: ['companies-select'],
    queryFn: async () => {
      const response = await fetch('/api/cad/companies/select');
      if (!response.ok) throw new Error('Erro ao carregar empresas');
      return response.json();
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const response = await fetch('/api/cad/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Erro ao criar usuário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Usuário criado com sucesso!');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar usuário');
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      const response = await fetch(`/api/cad/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erro ao atualizar usuário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário atualizado com sucesso!');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar usuário');
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/users/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erro ao excluir usuário');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, userIds, data }: { operation: string; userIds: number[]; data?: any }) => {
      const response = await fetch('/api/cad/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, userIds, data })
      });
      if (!response.ok) throw new Error('Erro na operação em lote');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      setSelectedUsers([]);
      toast.success('Operação realizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na operação em lote');
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const response = await fetch(`/api/cad/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (!response.ok) throw new Error('Erro ao redefinir senha');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso!');
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao redefinir senha');
    }
  });

  // Form handlers
  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || '',
        cargo: user.cargo || '',
        departamento: user.departamento || '',
        tipo_usuario: user.tipo_usuario,
        nivel_acesso: user.nivel_acesso,
        data_expiracao: user.data_expiracao || '',
        empresas_acesso: user.empresas_acesso || [],
        permissoes: user.permissoes || [],
        ativo: user.ativo
      });
    } else {
      setEditingUser(null);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cargo: '',
        departamento: '',
        tipo_usuario: 'OPERADOR',
        nivel_acesso: 1,
        senha: '',
        confirmar_senha: '',
        data_expiracao: '',
        empresas_acesso: [],
        permissoes: [],
        ativo: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      departamento: '',
      tipo_usuario: 'OPERADOR',
      nivel_acesso: 1,
      senha: '',
      confirmar_senha: '',
      data_expiracao: '',
      empresas_acesso: [],
      permissoes: [],
      ativo: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser && formData.senha !== formData.confirmar_senha) {
      toast.error('As senhas não conferem');
      return;
    }

    if (editingUser) {
      updateUserMutation.mutate({ 
        id: editingUser.id_usuario, 
        data: formData 
      });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleDelete = (user: User) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${user.nome}"?`)) {
      deleteUserMutation.mutate(user.id_usuario);
    }
  };

  const handleBulkOperation = (operation: string, data?: any) => {
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }
    
    bulkOperationMutation.mutate({ operation, userIds: selectedUsers, data });
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const allUserIds = usersData?.data?.map((user: User) => user.id_usuario) || [];
    setSelectedUsers(
      selectedUsers.length === allUserIds.length ? [] : allUserIds
    );
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const params = new URLSearchParams({
        formato: format,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/cad/users/export?${params}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'usuarios.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'usuarios.json';
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      toast.success('Exportação realizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar usuários');
    }
  };

  const getUserTypeLabel = (type: string) => {
    const types = {
      'ADMIN': 'Administrador',
      'GERENTE': 'Gerente',
      'OPERADOR': 'Operador',
      'VENDEDOR': 'Vendedor',
      'COMPRADOR': 'Comprador'
    };
    return types[type as keyof typeof types] || type;
  };

  const getAccessLevelColor = (level: number) => {
    if (level >= 5) return 'text-red-600 bg-red-50';
    if (level >= 3) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <span>Erro ao carregar usuários: {error.message}</span>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie usuários e controle de acesso</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <DropdownMenu>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <div className="mt-1 py-1 bg-white border rounded-md shadow-lg">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full px-4 py-2 text-left hover:bg-gray-50"
              >
                Exportar CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full px-4 py-2 text-left hover:bg-gray-50"
              >
                Exportar JSON
              </button>
            </div>
          </DropdownMenu>
          <Button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold">{statsData.data.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuários Ativos</p>
                <p className="text-2xl font-bold">{statsData.data.ativos}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Lock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuários Bloqueados</p>
                <p className="text-2xl font-bold">{statsData.data.bloqueados}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-2xl font-bold">{statsData.data.por_tipo?.find((t: any) => t.tipo === 'ADMIN')?.quantidade || 0}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome, email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Usuário
              </label>
              <select
                value={filters.tipo_usuario}
                onChange={(e) => setFilters(prev => ({ ...prev, tipo_usuario: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os tipos</option>
                <option value="ADMIN">Administrador</option>
                <option value="GERENTE">Gerente</option>
                <option value="OPERADOR">Operador</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="COMPRADOR">Comprador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.ativo}
                onChange={(e) => setFilters(prev => ({ ...prev, ativo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <Input
                placeholder="Departamento"
                value={filters.departamento}
                onChange={(e) => setFilters(prev => ({ ...prev, departamento: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bloqueado
              </label>
              <select
                value={filters.bloqueado}
                onChange={(e) => setFilters(prev => ({ ...prev, bloqueado: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Bloqueado</option>
                <option value="false">Não bloqueado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível de Acesso
              </label>
              <select
                value={filters.nivel_acesso}
                onChange={(e) => setFilters(prev => ({ ...prev, nivel_acesso: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os níveis</option>
                <option value="1">Nível 1 (Básico)</option>
                <option value="2">Nível 2 (Intermediário)</option>
                <option value="3">Nível 3 (Avançado)</option>
                <option value="4">Nível 4 (Gerencial)</option>
                <option value="5">Nível 5 (Administrativo)</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedUsers.length} usuário(s) selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('activate')}
                className="flex items-center gap-1"
              >
                <Unlock className="h-4 w-4" />
                Ativar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('deactivate')}
                className="flex items-center gap-1"
              >
                <Lock className="h-4 w-4" />
                Desativar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('unblock')}
                className="flex items-center gap-1"
              >
                <Unlock className="h-4 w-4" />
                Desbloquear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir os usuários selecionados?')) {
                    handleBulkOperation('delete');
                  }
                }}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === usersData?.data?.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo/Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersData?.data?.map((user: User) => (
                <tr key={user.id_usuario} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id_usuario)}
                      onChange={() => handleSelectUser(user.id_usuario)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.nome}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        {user.telefone && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.telefone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getUserTypeLabel(user.tipo_usuario)}
                    </div>
                    {user.cargo && (
                      <div className="text-sm text-gray-500">{user.cargo}</div>
                    )}
                    {user.departamento && (
                      <div className="text-sm text-gray-500">{user.departamento}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessLevelColor(user.nivel_acesso)}`}>
                      Nível {user.nivel_acesso}
                    </span>
                    {user.empresas_acesso && user.empresas_acesso.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {user.empresas_acesso.length} empresa(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.ultimo_login ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.ultimo_login).toLocaleDateString('pt-BR')}
                      </div>
                    ) : (
                      <span className="text-gray-400">Nunca</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.ativo 
                          ? 'text-green-800 bg-green-100' 
                          : 'text-red-800 bg-red-100'
                      }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {user.bloqueado && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-800 bg-red-100">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <DropdownMenu>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <div className="mt-1 py-1 bg-white border rounded-md shadow-lg min-w-[160px]">
                        <button
                          onClick={() => handleOpenForm(user)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowPasswordForm(true);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                        >
                          <Key className="h-4 w-4" />
                          Redefinir Senha
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowPermissionsModal(true);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                        >
                          <Shield className="h-4 w-4" />
                          Permissões
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => handleDelete(user)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData?.pagination && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, usersData.pagination.total)} de {usersData.pagination.total} usuários
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-700">
                  Página {currentPage} de {usersData.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(usersData.pagination.totalPages, prev + 1))}
                  disabled={currentPage === usersData.pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <Input
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <Input
                    value={formData.cargo}
                    onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                    placeholder="Cargo/Função"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <Input
                    value={formData.departamento}
                    onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                    placeholder="Departamento"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Usuário *
                  </label>
                  <select
                    required
                    value={formData.tipo_usuario}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_usuario: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OPERADOR">Operador</option>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="COMPRADOR">Comprador</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nível de Acesso *
                  </label>
                  <select
                    required
                    value={formData.nivel_acesso}
                    onChange={(e) => setFormData(prev => ({ ...prev, nivel_acesso: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Nível 1 (Básico)</option>
                    <option value={2}>Nível 2 (Intermediário)</option>
                    <option value={3}>Nível 3 (Avançado)</option>
                    <option value={4}>Nível 4 (Gerencial)</option>
                    <option value={5}>Nível 5 (Administrativo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Expiração
                  </label>
                  <Input
                    type="date"
                    value={formData.data_expiracao}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_expiracao: e.target.value }))}
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha *
                    </label>
                    <Input
                      required
                      type="password"
                      value={formData.senha}
                      onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                      placeholder="Senha"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Senha *
                    </label>
                    <Input
                      required
                      type="password"
                      value={formData.confirmar_senha}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmar_senha: e.target.value }))}
                      placeholder="Confirmar senha"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
                  Usuário ativo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {createUserMutation.isPending || updateUserMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : editingUser ? (
                    'Atualizar'
                  ) : (
                    'Criar'
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