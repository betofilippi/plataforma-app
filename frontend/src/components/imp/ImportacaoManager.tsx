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
  FileText,
  Ship,
  Package,
  DollarSign,
  TrendingUp,
  Activity,
  Eye,
  ChevronDown,
  Calendar,
  Globe,
  Truck,
  Receipt,
  ClipboardList,
  Archive,
  BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ImportacaoFormRouter from './forms/ImportacaoFormRouter';

interface ImportacaoTable {
  key: string;
  name: string;
  displayName: string;
  primaryKey: string;
  foreignKey?: string;
  hasItems?: boolean;
  hasContainers?: boolean;
  hasTributes?: boolean;
}

interface ImportacaoRecord {
  id: number;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface ImportacaoFilters {
  search: string;
  invoice_number: string;
  date_from: string;
  date_to: string;
  status: string;
  table_key: string;
}

interface TableStats {
  total: number;
  last_30_days: number;
  last_7_days: number;
  oldest_record: string;
  newest_record: string;
}

export default function ImportacaoManager() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedTable, setSelectedTable] = useState<string>('proforma_invoice');
  const [filters, setFilters] = useState<ImportacaoFilters>({
    search: '',
    invoice_number: '',
    date_from: '',
    date_to: '',
    status: '',
    table_key: 'proforma_invoice'
  });
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ImportacaoRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<string>('');

  const queryClient = useQueryClient();

  // Get all tables configuration
  const { data: tablesData } = useQuery({
    queryKey: ['importacao-tables'],
    queryFn: async () => {
      const response = await fetch('/api/imp/tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json();
    }
  });

  // Get dashboard data
  const { data: dashboardData } = useQuery({
    queryKey: ['importacao-dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/imp/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      return response.json();
    }
  });

  // Get records for selected table
  const { data: recordsData, isLoading, error, refetch } = useQuery({
    queryKey: ['importacao-records', selectedTable, currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: filters.search,
        invoice_number: filters.invoice_number,
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.status && { status: filters.status })
      });
      
      const response = await fetch(`/api/imp/${selectedTable}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch records');
      return response.json();
    },
    enabled: !!selectedTable
  });

  // Get table statistics
  const { data: statsData } = useQuery({
    queryKey: ['importacao-stats', selectedTable],
    queryFn: async () => {
      const response = await fetch(`/api/imp/${selectedTable}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!selectedTable
  });

  // Create record mutation
  const createRecordMutation = useMutation({
    mutationFn: async (recordData: any) => {
      const response = await fetch(`/api/imp/${selectedTable}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });
      if (!response.ok) throw new Error('Failed to create record');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacao-records'] });
      queryClient.invalidateQueries({ queryKey: ['importacao-stats'] });
      queryClient.invalidateQueries({ queryKey: ['importacao-dashboard'] });
      toast.success('Registro criado com sucesso!');
      setShowRecordForm(false);
      setEditingRecord(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar registro');
    }
  });

  // Update record mutation
  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/imp/${selectedTable}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update record');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacao-records'] });
      queryClient.invalidateQueries({ queryKey: ['importacao-stats'] });
      toast.success('Registro atualizado com sucesso!');
      setShowRecordForm(false);
      setEditingRecord(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar registro');
    }
  });

  // Delete record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/imp/${selectedTable}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete record');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacao-records'] });
      queryClient.invalidateQueries({ queryKey: ['importacao-stats'] });
      queryClient.invalidateQueries({ queryKey: ['importacao-dashboard'] });
      toast.success('Registro removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover registro');
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, recordIds, data }: { 
      operation: string; 
      recordIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch(`/api/imp/${selectedTable}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, record_ids: recordIds, data })
      });
      if (!response.ok) throw new Error('Failed to execute bulk operation');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['importacao-records'] });
      queryClient.invalidateQueries({ queryKey: ['importacao-stats'] });
      toast.success(`Operação ${variables.operation} executada com sucesso!`);
      setSelectedRecords([]);
      setBulkOperation('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na operação em lote');
    }
  });

  // Update filters when table changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, table_key: selectedTable }));
    setCurrentPage(1);
    setSelectedRecords([]);
  }, [selectedTable]);

  // Handle table selection
  const handleTableChange = (tableKey: string) => {
    setSelectedTable(tableKey);
  };

  // Handle edit
  const handleEdit = (record: ImportacaoRecord) => {
    setEditingRecord(record);
    setShowRecordForm(true);
  };

  // Handle bulk operations
  const handleBulkOperation = () => {
    if (selectedRecords.length === 0) {
      toast.error('Selecione ao menos um registro');
      return;
    }

    if (!bulkOperation) {
      toast.error('Selecione uma operação');
      return;
    }

    bulkOperationMutation.mutate({
      operation: bulkOperation,
      recordIds: selectedRecords
    });
  };

  // Export records
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        search: filters.search,
        invoice_number: filters.invoice_number,
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`/api/imp/${selectedTable}/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }
  };

  // Get table icon
  const getTableIcon = (tableKey: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      proforma_invoice: <FileText className="w-4 h-4" />,
      comprovante_pagamento: <DollarSign className="w-4 h-4" />,
      contrato_cambio: <Receipt className="w-4 h-4" />,
      swift: <Globe className="w-4 h-4" />,
      commercial_invoice: <FileText className="w-4 h-4" />,
      packing_list: <Package className="w-4 h-4" />,
      bill_of_lading: <Ship className="w-4 h-4" />,
      di_declaracao: <ClipboardList className="w-4 h-4" />,
      nota_fiscal: <Receipt className="w-4 h-4" />,
      fechamento: <Archive className="w-4 h-4" />
    };
    return iconMap[tableKey] || <FileText className="w-4 h-4" />;
  };

  const tables = tablesData?.data || [];
  const records = recordsData?.data || [];
  const pagination = recordsData?.pagination;
  const stats = statsData?.data;
  const dashboard = dashboardData?.data;
  const selectedTableConfig = tables.find((t: ImportacaoTable) => t.key === selectedTable);

  if (error) {
    return (
      <Alert variant="destructive">
        Erro ao carregar dados de importação: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Importação</h1>
          <p className="text-gray-600">Gerencie todos os documentos e processos de importação</p>
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
          <Button onClick={() => setShowRecordForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Processos</p>
                <p className="text-2xl font-bold">{dashboard.summary.total_processes}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processos Ativos</p>
                <p className="text-2xl font-bold text-green-600">{dashboard.summary.active_processes}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Atividade Recente</p>
                <p className="text-2xl font-bold text-orange-600">{dashboard.summary.recent_activity}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tabelas Ativas</p>
                <p className="text-2xl font-bold text-purple-600">{dashboard.tables.length}</p>
              </div>
              <Archive className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Table Selection */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Selecionar Tabela de Importação</label>
            <select
              value={selectedTable}
              onChange={(e) => handleTableChange(e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            >
              {tables.map((table: ImportacaoTable) => (
                <option key={table.key} value={table.key}>
                  {table.displayName}
                </option>
              ))}
            </select>
          </div>
          
          {/* Current Table Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-fit">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Últimos 30 dias</p>
                <p className="text-lg font-bold text-blue-600">{stats.last_30_days}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Últimos 7 dias</p>
                <p className="text-lg font-bold text-green-600">{stats.last_7_days}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Tipo</p>
                <div className="flex items-center justify-center">
                  {getTableIcon(selectedTable)}
                  <span className="ml-1 text-xs">DOC</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número da Invoice</label>
              <Input
                value={filters.invoice_number}
                onChange={(e) => setFilters({ ...filters, invoice_number: e.target.value })}
                placeholder="Filtrar por invoice..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Inicial</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Final</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="processing">Em Processamento</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
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
              placeholder="Buscar registros..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        
        {selectedRecords.length > 0 && (
          <div className="flex gap-2">
            <select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Operações em lote</option>
              <option value="delete">Excluir</option>
              <option value="update_status">Atualizar Status</option>
            </select>
            <Button 
              onClick={handleBulkOperation}
              disabled={!bulkOperation}
              variant="outline"
            >
              Executar ({selectedRecords.length})
            </Button>
          </div>
        )}
      </div>

      {/* Records Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRecords.length === records.length && records.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRecords(records.map((r: ImportacaoRecord) => r.id));
                      } else {
                        setSelectedRecords([]);
                      }
                    }}
                  />
                </th>
                <th className="p-3 text-left font-medium">ID</th>
                <th className="p-3 text-left font-medium">Invoice Number</th>
                <th className="p-3 text-left font-medium">Criado em</th>
                <th className="p-3 text-left font-medium">Atualizado em</th>
                <th className="p-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                records.map((record: ImportacaoRecord) => (
                  <tr key={record.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedRecords.includes(record.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecords([...selectedRecords, record.id]);
                          } else {
                            setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3 font-mono text-sm">{record.id}</td>
                    <td className="p-3">
                      <div className="flex items-center">
                        {getTableIcon(selectedTable)}
                        <span className="ml-2">{record.invoice_number || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(record.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(record.updated_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteRecordMutation.mutate(record.id)}
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
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, pagination.total)} de {pagination.total} registros
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

      {/* Record Form Modal */}
      {showRecordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingRecord ? 'Editar Registro' : 'Novo Registro'} - {selectedTableConfig?.displayName}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRecordForm(false);
                    setEditingRecord(null);
                  }}
                >
                  ×
                </Button>
              </div>

              <ImportacaoFormRouter
                tableKey={selectedTable}
                tableName={selectedTableConfig?.displayName || selectedTable}
                initialData={editingRecord}
                onSubmit={(data) => {
                  if (editingRecord) {
                    updateRecordMutation.mutate({ id: editingRecord.id, data });
                  } else {
                    createRecordMutation.mutate(data);
                  }
                }}
                onCancel={() => {
                  setShowRecordForm(false);
                  setEditingRecord(null);
                }}
                isLoading={createRecordMutation.isPending || updateRecordMutation.isPending}
              />

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRecordForm(false);
                    setEditingRecord(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={createRecordMutation.isPending || updateRecordMutation.isPending}
                >
                  {createRecordMutation.isPending || updateRecordMutation.isPending ? (
                    <LoadingSpinner />
                  ) : editingRecord ? (
                    'Atualizar'
                  ) : (
                    'Criar'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}