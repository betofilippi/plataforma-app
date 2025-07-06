'use client'

import React from 'react';
import { Card } from '@/components/ui/Card';
import { FileText, AlertCircle } from 'lucide-react';
import ProformaInvoiceForm from './ProformaInvoiceForm';
import CommercialInvoiceForm from './CommercialInvoiceForm';
import PackingListForm from './PackingListForm';

interface ImportacaoFormRouterProps {
  tableKey: string;
  tableName: string;
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Generic form component for tables that don't have specific forms yet
const GenericImportacaoForm = ({ 
  tableKey, 
  tableName, 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading 
}: ImportacaoFormRouterProps) => {
  const [formData, setFormData] = React.useState(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getTableFields = (tableKey: string) => {
    // Define basic fields for each table type
    const fieldMappings: Record<string, Array<{name: string, label: string, type: string, required?: boolean}>> = {
      comprovante_pagamento: [
        { name: 'numero_comprovante', label: 'Número do Comprovante', type: 'text', required: true },
        { name: 'data_pagamento', label: 'Data do Pagamento', type: 'date', required: true },
        { name: 'valor_pago_usd', label: 'Valor Pago (USD)', type: 'number', required: true },
        { name: 'banco_origem', label: 'Banco Origem', type: 'text' },
        { name: 'banco_destino', label: 'Banco Destino', type: 'text' },
        { name: 'swift_origem', label: 'SWIFT Origem', type: 'text' },
        { name: 'swift_destino', label: 'SWIFT Destino', type: 'text' },
        { name: 'observacoes', label: 'Observações', type: 'textarea' }
      ],
      contrato_cambio: [
        { name: 'numero_contrato', label: 'Número do Contrato', type: 'text', required: true },
        { name: 'data_contrato', label: 'Data do Contrato', type: 'date', required: true },
        { name: 'valor_contrato_usd', label: 'Valor do Contrato (USD)', type: 'number', required: true },
        { name: 'taxa_cambio', label: 'Taxa de Câmbio', type: 'number', required: true },
        { name: 'valor_reais', label: 'Valor em Reais', type: 'number' },
        { name: 'banco_contrato', label: 'Banco do Contrato', type: 'text' },
        { name: 'observacoes', label: 'Observações', type: 'textarea' }
      ],
      swift: [
        { name: 'numero_swift', label: 'Número SWIFT', type: 'text', required: true },
        { name: 'data_swift', label: 'Data SWIFT', type: 'date', required: true },
        { name: 'valor_transferido_usd', label: 'Valor Transferido (USD)', type: 'number', required: true },
        { name: 'banco_remetente', label: 'Banco Remetente', type: 'text' },
        { name: 'banco_beneficiario', label: 'Banco Beneficiário', type: 'text' },
        { name: 'codigo_swift_remetente', label: 'Código SWIFT Remetente', type: 'text' },
        { name: 'codigo_swift_beneficiario', label: 'Código SWIFT Beneficiário', type: 'text' },
        { name: 'observacoes', label: 'Observações', type: 'textarea' }
      ],
      bill_of_lading: [
        { name: 'numero_bl', label: 'Número do B/L', type: 'text', required: true },
        { name: 'data_bl', label: 'Data do B/L', type: 'date', required: true },
        { name: 'tipo_bl', label: 'Tipo de B/L', type: 'select', required: true },
        { name: 'porto_embarque', label: 'Porto de Embarque', type: 'text' },
        { name: 'porto_desembarque', label: 'Porto de Desembarque', type: 'text' },
        { name: 'navio', label: 'Nome do Navio', type: 'text' },
        { name: 'data_embarque', label: 'Data de Embarque', type: 'date' },
        { name: 'data_chegada_prevista', label: 'Data de Chegada Prevista', type: 'date' },
        { name: 'observacoes', label: 'Observações', type: 'textarea' }
      ],
      di_declaracao: [
        { name: 'numero_di', label: 'Número da DI', type: 'text', required: true },
        { name: 'data_registro', label: 'Data de Registro', type: 'date', required: true },
        { name: 'orgao_emissor', label: 'Órgão Emissor', type: 'text' },
        { name: 'cpf_responsavel', label: 'CPF do Responsável', type: 'text' },
        { name: 'valor_total_mercadorias', label: 'Valor Total das Mercadorias', type: 'number' },
        { name: 'valor_total_tributos', label: 'Valor Total dos Tributos', type: 'number' },
        { name: 'situacao', label: 'Situação', type: 'select' },
        { name: 'observacoes', label: 'Observações', type: 'textarea' }
      ],
      nota_fiscal: [
        { name: 'numero_nf', label: 'Número da Nota Fiscal', type: 'text', required: true },
        { name: 'serie_nf', label: 'Série da Nota Fiscal', type: 'text', required: true },
        { name: 'data_emissao', label: 'Data de Emissão', type: 'date', required: true },
        { name: 'valor_total_produtos', label: 'Valor Total dos Produtos', type: 'number' },
        { name: 'valor_total_tributos', label: 'Valor Total dos Tributos', type: 'number' },
        { name: 'valor_total_nf', label: 'Valor Total da NF', type: 'number' },
        { name: 'chave_acesso', label: 'Chave de Acesso', type: 'text' },
        { name: 'observacoes', label: 'Observações', type: 'textarea' }
      ],
      fechamento: [
        { name: 'data_fechamento', label: 'Data de Fechamento', type: 'date', required: true },
        { name: 'valor_total_processo', label: 'Valor Total do Processo', type: 'number' },
        { name: 'valor_total_impostos', label: 'Valor Total dos Impostos', type: 'number' },
        { name: 'valor_total_despesas', label: 'Valor Total das Despesas', type: 'number' },
        { name: 'valor_final', label: 'Valor Final', type: 'number' },
        { name: 'responsavel_fechamento', label: 'Responsável pelo Fechamento', type: 'text' },
        { name: 'status_processo', label: 'Status do Processo', type: 'select' },
        { name: 'observacoes_finais', label: 'Observações Finais', type: 'textarea' }
      ]
    };

    return fieldMappings[tableKey] || [
      { name: 'descricao', label: 'Descrição', type: 'text', required: true },
      { name: 'data_registro', label: 'Data de Registro', type: 'date', required: true },
      { name: 'observacoes', label: 'Observações', type: 'textarea' }
    ];
  };

  const fields = getTableFields(tableKey);

  const getSelectOptions = (fieldName: string) => {
    const optionMappings: Record<string, Array<{value: string, label: string}>> = {
      tipo_bl: [
        { value: 'original', label: 'Original' },
        { value: 'telex_release', label: 'Telex Release' },
        { value: 'sea_waybill', label: 'Sea Waybill' },
        { value: 'express_bl', label: 'Express B/L' }
      ],
      situacao: [
        { value: 'em_analise', label: 'Em Análise' },
        { value: 'deferida', label: 'Deferida' },
        { value: 'exigencia', label: 'Exigência' },
        { value: 'desembaracada', label: 'Desembaraçada' }
      ],
      status_processo: [
        { value: 'em_andamento', label: 'Em Andamento' },
        { value: 'finalizado', label: 'Finalizado' },
        { value: 'cancelado', label: 'Cancelado' },
        { value: 'suspenso', label: 'Suspenso' }
      ]
    };

    return optionMappings[fieldName] || [];
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dados de {tableName}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium mb-1">
                {field.label} {field.required && '*'}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  placeholder={`Digite ${field.label.toLowerCase()}`}
                  required={field.required}
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required={field.required}
                >
                  <option value="">Selecione {field.label.toLowerCase()}</option>
                  {getSelectOptions(field.name).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, 
                    field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                  )}
                  className="w-full p-2 border rounded-md"
                  placeholder={`Digite ${field.label.toLowerCase()}`}
                  required={field.required}
                  step={field.type === 'number' ? '0.01' : undefined}
                  min={field.type === 'number' ? '0' : undefined}
                />
              )}
            </div>
          ))}
        </div>

        {/* Common status field */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={formData.status || 'pending'}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            className="w-full p-2 border rounded-md md:w-1/2"
          >
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="processing">Em Processamento</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
};

export default function ImportacaoFormRouter(props: ImportacaoFormRouterProps) {
  const { tableKey, tableName } = props;

  // Route to specific form components based on table key
  switch (tableKey) {
    case 'proforma_invoice':
      return <ProformaInvoiceForm {...props} />;
    
    case 'commercial_invoice':
      return <CommercialInvoiceForm {...props} />;
    
    case 'packing_list':
      return <PackingListForm {...props} />;
    
    // For tables that don't have specific forms yet, show a development notice and generic form
    case 'comprovante_pagamento':
    case 'contrato_cambio':
    case 'swift':
    case 'bill_of_lading':
    case 'di_declaracao':
    case 'nota_fiscal':
    case 'fechamento':
      return (
        <div className="space-y-4">
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Formulário em Desenvolvimento</h4>
                <p className="text-sm text-yellow-700">
                  O formulário específico para <strong>{tableName}</strong> está sendo desenvolvido. 
                  Por enquanto, você pode usar o formulário genérico abaixo para criar registros básicos.
                </p>
              </div>
            </div>
          </Card>
          <GenericImportacaoForm {...props} />
        </div>
      );
    
    // Default case for unknown tables
    default:
      return (
        <div className="space-y-4">
          <Card className="p-6 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">
              Formulário não disponível
            </h3>
            <p className="text-gray-600 mt-2">
              O formulário para <strong>{tableName}</strong> ainda não foi implementado.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Tabela: {tableKey}
            </p>
          </Card>
          
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-800">Desenvolvimento em Progresso</h4>
                <p className="text-sm text-blue-700">
                  Este formulário será implementado em breve. Por enquanto, você pode visualizar 
                  e gerenciar os dados existentes através da listagem.
                </p>
              </div>
            </div>
          </Card>
          
          <GenericImportacaoForm {...props} />
        </div>
      );
  }
}