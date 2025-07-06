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
  Edit, 
  Trash2, 
  Move,
  MoreHorizontal,
  FolderTree,
  Package,
  Eye,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Category {
  id_categoria: number;
  nome: string;
  descricao?: string;
  codigo?: string;
  parent_id?: number;
  nivel: number;
  caminho_completo: string;
  categoria_pai?: string;
  total_subcategorias: number;
  total_produtos: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

interface CategoryFilters {
  search: string;
  ativo: string;
  nivel: string;
}

interface CategoryFormData {
  nome: string;
  descricao: string;
  codigo: string;
  parent_id?: number;
  ativo: boolean;
}

export default function CategoryManager() {
  const [showTreeView, setShowTreeView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<CategoryFilters>({
    search: '',
    ativo: '',
    nivel: ''
  });
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categoriesData, isLoading, error, refetch } = useQuery({
    queryKey: ['categories', currentPage, pageSize, filters, showTreeView],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        hierarchical: showTreeView.toString(),
        ...filters
      });
      
      const response = await fetch(`/api/cad/categories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Category statistics
  const { data: statsData } = useQuery({
    queryKey: ['category-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cad/categories/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Categories for parent selection
  const { data: parentCategoriesData } = useQuery({
    queryKey: ['categories-select', editingCategory?.id_categoria],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (editingCategory?.id_categoria) {
        params.append('exclude_id', editingCategory.id_categoria.toString());
      }
      const response = await fetch(`/api/cad/categories/select?${params}`);
      if (!response.ok) throw new Error('Failed to fetch parent categories');
      return response.json();
    },
    enabled: showCategoryForm
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryFormData) => {
      const response = await fetch('/api/cad/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      toast.success('Categoria criada com sucesso!');
      setShowCategoryForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar categoria');
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CategoryFormData> }) => {
      const response = await fetch(`/api/cad/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      toast.success('Categoria atualizada com sucesso!');
      setShowCategoryForm(false);
      setEditingCategory(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar categoria');
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/categories/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      toast.success('Categoria removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover categoria');
    }
  });

  // Move category mutation
  const moveCategoryMutation = useMutation({
    mutationFn: async ({ id, newParentId }: { id: number; newParentId: number | null }) => {
      const response = await fetch(`/api/cad/categories/${id}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_parent_id: newParentId })
      });
      if (!response.ok) throw new Error('Failed to move category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria movida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao mover categoria');
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, categoryIds, data }: { 
      operation: string; 
      categoryIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/cad/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, category_ids: categoryIds, data })
      });
      if (!response.ok) throw new Error('Failed to execute bulk operation');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      toast.success(`Operação ${variables.operation} executada com sucesso!`);
      setSelectedCategories([]);
      setBulkOperation('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na operação em lote');
    }
  });

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    nome: '',
    descricao: '',
    codigo: '',
    ativo: true
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      codigo: '',
      ativo: true
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id_categoria,
        data: formData
      });
    } else {
      createCategoryMutation.mutate(formData);
    }
  };

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nome: category.nome,
      descricao: category.descricao || '',
      codigo: category.codigo || '',
      parent_id: category.parent_id,
      ativo: category.ativo
    });
    setShowCategoryForm(true);
  };

  // Handle bulk operations
  const handleBulkOperation = () => {
    if (selectedCategories.length === 0) {
      toast.error('Selecione ao menos uma categoria');
      return;
    }

    if (!bulkOperation) {
      toast.error('Selecione uma operação');
      return;
    }

    bulkOperationMutation.mutate({
      operation: bulkOperation,
      categoryIds: selectedCategories
    });
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Render tree view
  const renderTreeView = (categories: Category[], level = 0) => {
    return categories.map((category) => (
      <div key={category.id_categoria} className="border-l border-gray-200">
        <div 
          className={`flex items-center p-2 hover:bg-gray-50 ${
            selectedCategories.includes(category.id_categoria) ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <input
            type="checkbox"
            checked={selectedCategories.includes(category.id_categoria)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedCategories([...selectedCategories, category.id_categoria]);
              } else {
                setSelectedCategories(selectedCategories.filter(id => id !== category.id_categoria));
              }
            }}
            className="mr-2"
          />
          
          {category.total_subcategorias > 0 && (
            <button
              onClick={() => toggleCategoryExpansion(category.id_categoria)}
              className="mr-1"
            >
              {expandedCategories.has(category.id_categoria) ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </button>
          )}
          
          {category.total_subcategorias > 0 ? (
            expandedCategories.has(category.id_categoria) ? 
              <FolderOpen className="w-4 h-4 mr-2 text-blue-500" /> :
              <Folder className="w-4 h-4 mr-2 text-blue-500" />
          ) : (
            <div className="w-4 h-4 mr-2" />
          )}

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{category.nome}</span>
                {category.codigo && (
                  <span className="ml-2 text-sm text-gray-500">({category.codigo})</span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{category.total_produtos} produtos</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  category.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {category.ativo ? 'Ativo' : 'Inativo'}
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleEdit(category)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Move className="w-4 h-4 mr-2" />
                      Mover
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => deleteCategoryMutation.mutate(category.id_categoria)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {category.descricao && (
              <div className="text-sm text-gray-600 mt-1">
                {category.descricao}
              </div>
            )}
          </div>
        </div>
        
        {category.children && expandedCategories.has(category.id_categoria) && (
          <div>
            {renderTreeView(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const categories = categoriesData?.data || [];
  const pagination = categoriesData?.pagination;
  const stats = statsData?.data;

  if (error) {
    return (
      <Alert variant="destructive">
        Erro ao carregar categorias: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600">Gerencie a hierarquia de categorias</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showTreeView ? "default" : "outline"}
            onClick={() => setShowTreeView(!showTreeView)}
          >
            <FolderTree className="w-4 h-4 mr-2" />
            {showTreeView ? 'Lista' : 'Árvore'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowCategoryForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Categorias</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FolderTree className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categorias Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativas}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categorias Raiz</p>
                <p className="text-2xl font-bold">{stats.categorias_raiz}</p>
              </div>
              <Folder className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Com Produtos</p>
                <p className="text-2xl font-bold text-orange-600">{stats.com_produtos}</p>
              </div>
              <Package className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium mb-1">Nível</label>
              <select
                value={filters.nivel}
                onChange={(e) => setFilters({ ...filters, nivel: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os níveis</option>
                <option value="1">Nível 1 (Raiz)</option>
                <option value="2">Nível 2</option>
                <option value="3">Nível 3</option>
                <option value="4">Nível 4+</option>
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
              placeholder="Buscar categorias..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        
        {selectedCategories.length > 0 && (
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
              <option value="move">Mover</option>
            </select>
            <Button 
              onClick={handleBulkOperation}
              disabled={!bulkOperation}
              variant="outline"
            >
              Executar ({selectedCategories.length})
            </Button>
          </div>
        )}
      </div>

      {/* Categories Display */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma categoria encontrada
          </div>
        ) : showTreeView ? (
          <div className="p-4">
            {renderTreeView(categories)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCategories.length === categories.length && categories.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories(categories.map((c: Category) => c.id_categoria));
                        } else {
                          setSelectedCategories([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-3 text-left font-medium">Nome</th>
                  <th className="p-3 text-left font-medium">Código</th>
                  <th className="p-3 text-left font-medium">Caminho</th>
                  <th className="p-3 text-left font-medium">Produtos</th>
                  <th className="p-3 text-left font-medium">Subcategorias</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category: Category) => (
                  <tr key={category.id_categoria} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id_categoria)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, category.id_categoria]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id_categoria));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3 font-medium">{category.nome}</td>
                    <td className="p-3 font-mono text-sm">{category.codigo || '-'}</td>
                    <td className="p-3 text-sm text-gray-600">{category.caminho_completo}</td>
                    <td className="p-3">{category.total_produtos}</td>
                    <td className="p-3">{category.total_subcategorias}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        category.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.ativo ? 'Ativo' : 'Inativo'}
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
                          <DropdownMenuItem onClick={() => handleEdit(category)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Move className="w-4 h-4 mr-2" />
                            Mover
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteCategoryMutation.mutate(category.id_categoria)}
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
        {!showTreeView && pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, pagination.total)} de {pagination.total} categorias
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

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                >
                  ×
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nome *
                    </label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Código
                    </label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Categoria Pai
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      parent_id: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Categoria raiz</option>
                    {parentCategoriesData?.data?.map((category: any) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
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
                    Categoria Ativa
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setEditingCategory(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  >
                    {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                      <LoadingSpinner />
                    ) : editingCategory ? (
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