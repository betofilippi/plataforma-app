'use client'

import React, { useState, useEffect, useMemo } from 'react';
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
  Package,
  DollarSign,
  TrendingUp,
  Archive,
  Eye,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Product {
  id_produto: number;
  codigo: string;
  descricao: string;
  descricao_detalhada?: string;
  categoria?: {
    id_categoria: number;
    nome: string;
  };
  fornecedor?: {
    id_fornecedor: number;
    nome_razao_social: string;
  };
  unidade_medida: string;
  preco_custo?: number;
  preco_venda?: number;
  margem_lucro?: number;
  peso_liquido?: number;
  peso_bruto?: number;
  volume_m3?: number;
  estoque_minimo?: number;
  estoque_maximo?: number;
  estoque_atual?: number;
  ncm?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFilters {
  search: string;
  categoria: string;
  fornecedor: string;
  ativo: string;
  tipo: string;
}

interface ProductFormData {
  codigo: string;
  descricao: string;
  descricao_detalhada: string;
  id_categoria?: number;
  id_fornecedor?: number;
  unidade_medida: string;
  preco_custo: number;
  preco_venda: number;
  peso_liquido?: number;
  peso_bruto?: number;
  volume_m3?: number;
  estoque_minimo?: number;
  estoque_maximo?: number;
  ncm?: string;
  ativo: boolean;
}

export default function ProductManager() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    categoria: '',
    fornecedor: '',
    ativo: '',
    tipo: ''
  });
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<string>('');

  const queryClient = useQueryClient();

  // Fetch products with pagination and filters
  const { data: productsData, isLoading, error, refetch } = useQuery({
    queryKey: ['products', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...filters
      });
      
      const response = await fetch(`/api/cad/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  // Fetch categories for filters and form
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-select'],
    queryFn: async () => {
      const response = await fetch('/api/cad/categories/select');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch suppliers for filters and form
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: async () => {
      const response = await fetch('/api/cad/suppliers/select');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    }
  });

  // Fetch units for form
  const { data: unitsData } = useQuery({
    queryKey: ['units-select'],
    queryFn: async () => {
      const response = await fetch('/api/cad/units/select');
      if (!response.ok) throw new Error('Failed to fetch units');
      return response.json();
    }
  });

  // Product statistics
  const { data: statsData } = useQuery({
    queryKey: ['product-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cad/products/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const response = await fetch('/api/cad/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (!response.ok) throw new Error('Failed to create product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      toast.success('Produto criado com sucesso!');
      setShowProductForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar produto');
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProductFormData> }) => {
      const response = await fetch(`/api/cad/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      toast.success('Produto atualizado com sucesso!');
      setShowProductForm(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar produto');
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cad/products/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      toast.success('Produto removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover produto');
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, productIds, data }: { 
      operation: string; 
      productIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/cad/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, product_ids: productIds, data })
      });
      if (!response.ok) throw new Error('Failed to execute bulk operation');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      toast.success(`Operação ${variables.operation} executada com sucesso!`);
      setSelectedProducts([]);
      setBulkOperation('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na operação em lote');
    }
  });

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    codigo: '',
    descricao: '',
    descricao_detalhada: '',
    unidade_medida: '',
    preco_custo: 0,
    preco_venda: 0,
    ativo: true
  });

  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      descricao_detalhada: '',
      unidade_medida: '',
      preco_custo: 0,
      preco_venda: 0,
      ativo: true
    });
  };

  // Calculate margin when prices change
  const calculateMargin = (costPrice: number, salePrice: number) => {
    if (costPrice <= 0) return 0;
    return ((salePrice - costPrice) / costPrice) * 100;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      updateProductMutation.mutate({
        id: editingProduct.id_produto,
        data: formData
      });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  // Handle edit
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      codigo: product.codigo,
      descricao: product.descricao,
      descricao_detalhada: product.descricao_detalhada || '',
      id_categoria: product.categoria?.id_categoria,
      id_fornecedor: product.fornecedor?.id_fornecedor,
      unidade_medida: product.unidade_medida,
      preco_custo: product.preco_custo || 0,
      preco_venda: product.preco_venda || 0,
      peso_liquido: product.peso_liquido,
      peso_bruto: product.peso_bruto,
      volume_m3: product.volume_m3,
      estoque_minimo: product.estoque_minimo,
      estoque_maximo: product.estoque_maximo,
      ncm: product.ncm,
      ativo: product.ativo
    });
    setShowProductForm(true);
  };

  // Handle bulk operations
  const handleBulkOperation = () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecione ao menos um produto');
      return;
    }

    if (!bulkOperation) {
      toast.error('Selecione uma operação');
      return;
    }

    bulkOperationMutation.mutate({
      operation: bulkOperation,
      productIds: selectedProducts
    });
  };

  // Export products
  const handleExport = async () => {
    try {
      const response = await fetch('/api/cad/products/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'produtos.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Produtos exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar produtos');
    }
  };

  const products = productsData?.data || [];
  const pagination = productsData?.pagination;
  const stats = statsData?.data;

  const currentMargin = useMemo(() => {
    return calculateMargin(formData.preco_custo, formData.preco_venda);
  }, [formData.preco_custo, formData.preco_venda]);

  if (error) {
    return (
      <Alert variant="destructive">
        Erro ao carregar produtos: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600">Gerencie o catálogo de produtos</p>
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
          <Button onClick={() => setShowProductForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produtos Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total Estoque</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(stats.valor_total_estoque || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Margem Média</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.margem_media?.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={filters.categoria}
                onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas as categorias</option>
                {categoriesData?.data?.map((category: any) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fornecedor</label>
              <select
                value={filters.fornecedor}
                onChange={(e) => setFilters({ ...filters, fornecedor: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os fornecedores</option>
                {suppliersData?.data?.map((supplier: any) => (
                  <option key={supplier.value} value={supplier.value}>
                    {supplier.label}
                  </option>
                ))}
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
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os tipos</option>
                <option value="produto">Produto</option>
                <option value="servico">Serviço</option>
                <option value="materia_prima">Matéria Prima</option>
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
              placeholder="Buscar produtos..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        
        {selectedProducts.length > 0 && (
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
              <option value="update_prices">Atualizar Preços</option>
            </select>
            <Button 
              onClick={handleBulkOperation}
              disabled={!bulkOperation}
              variant="outline"
            >
              Executar ({selectedProducts.length})
            </Button>
          </div>
        )}
      </div>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts(products.map((p: Product) => p.id_produto));
                      } else {
                        setSelectedProducts([]);
                      }
                    }}
                  />
                </th>
                <th className="p-3 text-left font-medium">Código</th>
                <th className="p-3 text-left font-medium">Descrição</th>
                <th className="p-3 text-left font-medium">Categoria</th>
                <th className="p-3 text-left font-medium">Unidade</th>
                <th className="p-3 text-left font-medium">Preço Venda</th>
                <th className="p-3 text-left font-medium">Estoque</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                products.map((product: Product) => (
                  <tr key={product.id_produto} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id_produto)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product.id_produto]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product.id_produto));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3 font-mono text-sm">{product.codigo}</td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{product.descricao}</div>
                        {product.fornecedor && (
                          <div className="text-sm text-gray-500">
                            {product.fornecedor.nome_razao_social}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {product.categoria?.nome || '-'}
                    </td>
                    <td className="p-3">{product.unidade_medida}</td>
                    <td className="p-3">
                      {product.preco_venda ? 
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(product.preco_venda) : '-'
                      }
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>Atual: {product.estoque_atual || 0}</div>
                        {product.estoque_minimo && (
                          <div className="text-gray-500">
                            Min: {product.estoque_minimo}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.ativo ? 'Ativo' : 'Inativo'}
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
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="w-4 h-4 mr-2" />
                            {product.ativo ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteProductMutation.mutate(product.id_produto)}
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
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, pagination.total)} de {pagination.total} produtos
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

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                >
                  ×
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Código *
                    </label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Unidade de Medida *
                    </label>
                    <select
                      value={formData.unidade_medida}
                      onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Selecione...</option>
                      {unitsData?.data?.map((unit: any) => (
                        <option key={unit.value} value={unit.simbolo}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descrição *
                  </label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descrição Detalhada
                  </label>
                  <textarea
                    value={formData.descricao_detalhada}
                    onChange={(e) => setFormData({ ...formData, descricao_detalhada: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows={3}
                  />
                </div>

                {/* Category and Supplier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Categoria
                    </label>
                    <select
                      value={formData.id_categoria || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        id_categoria: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Selecione...</option>
                      {categoriesData?.data?.map((category: any) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Fornecedor
                    </label>
                    <select
                      value={formData.id_fornecedor || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        id_fornecedor: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Selecione...</option>
                      {suppliersData?.data?.map((supplier: any) => (
                        <option key={supplier.value} value={supplier.value}>
                          {supplier.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Preço de Custo
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.preco_custo}
                      onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Preço de Venda *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.preco_venda}
                      onChange={(e) => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Margem de Lucro
                    </label>
                    <Input
                      value={`${currentMargin.toFixed(2)}%`}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                </div>

                {/* Physical Properties */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Peso Líquido (kg)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.peso_liquido || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        peso_liquido: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Peso Bruto (kg)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.peso_bruto || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        peso_bruto: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Volume (m³)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.volume_m3 || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        volume_m3: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                    />
                  </div>
                </div>

                {/* Stock Control */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Estoque Mínimo
                    </label>
                    <Input
                      type="number"
                      value={formData.estoque_minimo || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        estoque_minimo: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Estoque Máximo
                    </label>
                    <Input
                      type="number"
                      value={formData.estoque_maximo || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        estoque_maximo: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                    />
                  </div>
                </div>

                {/* NCM and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      NCM
                    </label>
                    <Input
                      value={formData.ncm || ''}
                      onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                      placeholder="00000000"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    />
                    <label htmlFor="ativo" className="text-sm font-medium">
                      Produto Ativo
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {createProductMutation.isPending || updateProductMutation.isPending ? (
                      <LoadingSpinner />
                    ) : editingProduct ? (
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