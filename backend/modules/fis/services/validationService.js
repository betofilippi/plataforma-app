const { z } = require('zod');

// Tax Configuration Schema
const taxConfigurationSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  tipo_regime: z.enum(['SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'], 'Regime tributário inválido'),
  inscricao_estadual: z.string().min(1, 'Inscrição estadual é obrigatória').max(20),
  inscricao_municipal: z.string().max(20).optional(),
  cnae_principal: z.string().min(7, 'CNAE deve ter pelo menos 7 caracteres').max(10),
  cnaes_secundarios: z.array(z.string()).optional(),
  aliquota_simples: z.number().min(0).max(100).optional(),
  observacoes: z.string().max(1000).optional()
});

// Electronic Invoice Schema (NFe)
const electronicInvoiceSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  id_cliente: z.number().int().positive('ID do cliente é obrigatório'),
  id_pedido_venda: z.number().int().positive().optional(),
  tipo_operacao: z.enum(['VENDA', 'DEVOLUCAO', 'TRANSFERENCIA', 'REMESSA', 'RETORNO'], 'Tipo de operação inválido'),
  natureza_operacao: z.string().min(1, 'Natureza da operação é obrigatória').max(60),
  serie: z.number().int().min(1).max(999, 'Série deve estar entre 1 e 999'),
  numero: z.number().int().positive('Número da nota é obrigatório'),
  data_emissao: z.string().datetime('Data de emissão deve ser uma data válida'),
  data_saida: z.string().datetime('Data de saída deve ser uma data válida').optional(),
  finalidade: z.enum(['NORMAL', 'COMPLEMENTAR', 'AJUSTE', 'DEVOLUCAO'], 'Finalidade inválida'),
  consumidor_final: z.boolean().default(false),
  presenca_comprador: z.enum(['PRESENCIAL', 'INTERNET', 'TELEFONE', 'DOMICILIO', 'OUTROS'], 'Presença do comprador inválida'),
  modalidade_frete: z.enum(['REMETENTE', 'DESTINATARIO', 'TERCEIROS', 'SEM_FRETE'], 'Modalidade de frete inválida'),
  observacoes: z.string().max(5000).optional(),
  observacoes_fisco: z.string().max(2000).optional(),
  itens: z.array(z.object({
    id_produto: z.number().int().positive('ID do produto é obrigatório'),
    quantidade: z.number().positive('Quantidade deve ser maior que zero'),
    valor_unitario: z.number().positive('Valor unitário deve ser maior que zero'),
    desconto: z.number().min(0).optional(),
    cfop: z.string().length(4, 'CFOP deve ter 4 dígitos'),
    ncm: z.string().min(8, 'NCM deve ter pelo menos 8 dígitos').max(10),
    cest: z.string().optional(),
    unidade_comercial: z.string().min(1).max(6),
    unidade_tributavel: z.string().min(1).max(6).optional(),
    icms_situacao: z.string().length(3, 'Situação do ICMS deve ter 3 dígitos'),
    icms_origem: z.enum(['0', '1', '2', '3', '4', '5', '6', '7', '8'], 'Origem do ICMS inválida'),
    ipi_situacao: z.string().length(2).optional(),
    pis_situacao: z.string().length(2).optional(),
    cofins_situacao: z.string().length(2).optional()
  })).min(1, 'Deve haver pelo menos um item na nota')
});

// Service Invoice Schema (NFSe)
const serviceInvoiceSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  id_cliente: z.number().int().positive('ID do cliente é obrigatório'),
  id_pedido_venda: z.number().int().positive().optional(),
  numero_rps: z.number().int().positive('Número do RPS é obrigatório'),
  serie_rps: z.string().min(1).max(5),
  tipo_rps: z.enum(['RPS', 'NFSe_CONJUGADA', 'CUPOM'], 'Tipo de RPS inválido'),
  data_emissao: z.string().datetime('Data de emissão deve ser uma data válida'),
  data_prestacao: z.string().datetime('Data de prestação deve ser uma data válida'),
  natureza_operacao: z.enum(['TRIBUTACAO_NO_MUNICIPIO', 'TRIBUTACAO_FORA_MUNICIPIO', 'ISENCAO', 'IMUNE', 'SUSPENSA_JUDICIAL'], 'Natureza da operação inválida'),
  regime_especial: z.enum(['MICROEMPRESA_MUNICIPAL', 'ESTIMATIVA', 'SOCIEDADE_PROFISSIONAIS', 'COOPERATIVA', 'MEI', 'ME_EPP_SIMPLES']).optional(),
  optante_simples: z.boolean().default(false),
  incentivador_cultural: z.boolean().default(false),
  codigo_servico: z.string().min(1, 'Código do serviço é obrigatório').max(20),
  discriminacao: z.string().min(1, 'Discriminação é obrigatória').max(8000),
  codigo_municipio: z.string().length(7, 'Código do município deve ter 7 dígitos'),
  valor_servicos: z.number().positive('Valor dos serviços deve ser maior que zero'),
  valor_deducoes: z.number().min(0).optional(),
  valor_pis: z.number().min(0).optional(),
  valor_cofins: z.number().min(0).optional(),
  valor_inss: z.number().min(0).optional(),
  valor_ir: z.number().min(0).optional(),
  valor_csll: z.number().min(0).optional(),
  valor_iss: z.number().min(0).optional(),
  valor_desconto_incondicionado: z.number().min(0).optional(),
  valor_desconto_condicionado: z.number().min(0).optional(),
  aliquota: z.number().min(0).max(100, 'Alíquota deve estar entre 0 e 100%'),
  observacoes: z.string().max(2000).optional()
});

// Tax Calculation Schema
const taxCalculationSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  tipo_documento: z.enum(['NFE', 'NFSE', 'NFCE', 'CTE', 'MDFE'], 'Tipo de documento inválido'),
  itens: z.array(z.object({
    id_produto: z.number().int().positive('ID do produto é obrigatório'),
    quantidade: z.number().positive('Quantidade deve ser maior que zero'),
    valor_unitario: z.number().positive('Valor unitário deve ser maior que zero'),
    desconto: z.number().min(0).optional(),
    cfop: z.string().length(4, 'CFOP deve ter 4 dígitos'),
    uf_origem: z.string().length(2, 'UF de origem deve ter 2 caracteres'),
    uf_destino: z.string().length(2, 'UF de destino deve ter 2 caracteres'),
    ncm: z.string().min(8).max(10),
    cest: z.string().optional(),
    finalidade: z.enum(['CONSUMO', 'REVENDA', 'IMOBILIZADO', 'USO_CONSUMO'], 'Finalidade inválida')
  })).min(1, 'Deve haver pelo menos um item'),
  cliente: z.object({
    id_cliente: z.number().int().positive(),
    tipo_pessoa: z.enum(['F', 'J'], 'Tipo de pessoa inválido'),
    inscricao_estadual: z.string().optional(),
    inscricao_municipal: z.string().optional(),
    contribuinte_icms: z.boolean().default(false),
    uf: z.string().length(2, 'UF deve ter 2 caracteres'),
    codigo_municipio: z.string().length(7, 'Código do município deve ter 7 dígitos')
  })
});

// Fiscal Document Schema
const fiscalDocumentSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  tipo_documento: z.enum(['NFE', 'NFSE', 'NFCE', 'CTE', 'MDFE'], 'Tipo de documento inválido'),
  numero_documento: z.string().min(1, 'Número do documento é obrigatório').max(50),
  serie: z.string().min(1).max(10),
  chave_acesso: z.string().length(44, 'Chave de acesso deve ter 44 caracteres').optional(),
  protocolo_autorizacao: z.string().max(50).optional(),
  data_emissao: z.string().datetime('Data de emissão deve ser uma data válida'),
  data_autorizacao: z.string().datetime().optional(),
  valor_total: z.number().positive('Valor total deve ser maior que zero'),
  valor_tributos: z.number().min(0, 'Valor dos tributos deve ser maior ou igual a zero'),
  situacao: z.enum(['RASCUNHO', 'PENDENTE', 'AUTORIZADO', 'CANCELADO', 'REJEITADO', 'DENEGADO'], 'Situação inválida'),
  motivo_rejeicao: z.string().max(1000).optional(),
  xml_documento: z.string().optional(),
  pdf_documento: z.string().optional(),
  observacoes: z.string().max(2000).optional()
});

// Tax Report Schema
const taxReportSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  tipo_relatorio: z.enum(['APURACAO_ICMS', 'APURACAO_IPI', 'LIVRO_FISCAL', 'SPED_FISCAL', 'SPED_CONTRIBUICOES', 'DEFIS'], 'Tipo de relatório inválido'),
  periodo_inicial: z.string().datetime('Período inicial deve ser uma data válida'),
  periodo_final: z.string().datetime('Período final deve ser uma data válida'),
  regime_tributario: z.enum(['SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'], 'Regime tributário inválido'),
  observacoes: z.string().max(1000).optional()
});

// Tax Rule Schema
const taxRuleSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  nome_regra: z.string().min(1, 'Nome da regra é obrigatório').max(100),
  tipo_regra: z.enum(['ICMS', 'IPI', 'PIS', 'COFINS', 'ISS', 'IRPJ', 'CSLL'], 'Tipo de regra inválido'),
  uf_origem: z.string().length(2).optional(),
  uf_destino: z.string().length(2).optional(),
  cfop: z.string().length(4).optional(),
  ncm: z.string().min(8).max(10).optional(),
  tipo_pessoa: z.enum(['F', 'J']).optional(),
  contribuinte_icms: z.boolean().optional(),
  regime_tributario: z.enum(['SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL']).optional(),
  aliquota: z.number().min(0).max(100, 'Alíquota deve estar entre 0 e 100%'),
  base_calculo: z.enum(['VALOR_PRODUTO', 'VALOR_FRETE', 'VALOR_SEGURO', 'VALOR_DESCONTO'], 'Base de cálculo inválida'),
  situacao_tributaria: z.string().max(10),
  reducao_base: z.number().min(0).max(100).optional(),
  valor_fixo: z.number().min(0).optional(),
  data_inicio: z.string().datetime('Data de início deve ser uma data válida'),
  data_fim: z.string().datetime().optional(),
  ativo: z.boolean().default(true),
  observacoes: z.string().max(500).optional()
});

// Electronic Invoice Cancel Schema
const cancelInvoiceSchema = z.object({
  justificativa: z.string().min(15, 'Justificativa deve ter pelo menos 15 caracteres').max(255, 'Justificativa deve ter no máximo 255 caracteres')
});

// Electronic Invoice Correction Schema
const correctionInvoiceSchema = z.object({
  correcao: z.string().min(15, 'Correção deve ter pelo menos 15 caracteres').max(1000, 'Correção deve ter no máximo 1000 caracteres')
});

// SPED Fiscal Schema
const spedFiscalSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  periodo_inicial: z.string().datetime('Período inicial deve ser uma data válida'),
  periodo_final: z.string().datetime('Período final deve ser uma data válida'),
  perfil_apresentacao: z.enum(['A', 'B', 'C'], 'Perfil de apresentação inválido'),
  tipo_escrituracao: z.enum(['COMPLETA', 'RESUMIDA'], 'Tipo de escrituração inválido'),
  indicador_situacao: z.enum(['REGULAR', 'RETIFICADORA', 'EXTEMPOR NEAD'], 'Indicador de situação inválido'),
  indicador_atividade: z.enum(['INDUSTRIAL', 'COMERCIAL', 'SERVICOS', 'MISTA'], 'Indicador de atividade inválido')
});

module.exports = {
  taxConfigurationSchema,
  electronicInvoiceSchema,
  serviceInvoiceSchema,
  taxCalculationSchema,
  fiscalDocumentSchema,
  taxReportSchema,
  taxRuleSchema,
  cancelInvoiceSchema,
  correctionInvoiceSchema,
  spedFiscalSchema
};