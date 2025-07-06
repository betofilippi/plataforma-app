const db = require('../../../src/database/connection');
const { nfseSchema, nfseUpdateSchema } = require('../services/validationService');
const { z } = require('zod');

// NFSe Controller - Service Invoices Management for Brazilian Municipal Tax Compliance
class NFSeController {
  // Get all NFSe with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Parse and validate filters
      const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        id_empresa: req.query.id_empresa || '',
        id_cliente: req.query.id_cliente || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        codigo_servico: req.query.codigo_servico || '',
        situacao_prefeitura: req.query.situacao_prefeitura || ''
      };

      // Base query with joins
      let query = db('fis_08_nfse as nfse')
        .leftJoin('cad_01_empresas as e', 'nfse.id_empresa', 'e.id_empresa')
        .leftJoin('cad_03_clientes as c', 'nfse.id_tomador', 'c.id_cliente')
        .leftJoin('cad_05_usuarios as u', 'nfse.id_usuario_criacao', 'u.id_usuario')
        .select(
          'nfse.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'e.inscricao_municipal as empresa_im',
          'c.nome_razao_social as tomador_nome',
          'c.cnpj_cpf as tomador_documento',
          'u.nome as criado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('nfse.numero_nfse', 'ilike', `%${filters.search}%`)
              .orWhere('nfse.numero_rps', 'ilike', `%${filters.search}%`)
              .orWhere('c.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('c.cnpj_cpf', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('nfse.status', filters.status);
      }

      if (filters.id_empresa) {
        query = query.where('nfse.id_empresa', filters.id_empresa);
      }

      if (filters.id_cliente) {
        query = query.where('nfse.id_tomador', filters.id_cliente);
      }

      if (filters.data_inicial && filters.data_final) {
        query = query.whereBetween('nfse.data_emissao', [filters.data_inicial, filters.data_final]);
      } else if (filters.data_inicial) {
        query = query.where('nfse.data_emissao', '>=', filters.data_inicial);
      } else if (filters.data_final) {
        query = query.where('nfse.data_emissao', '<=', filters.data_final);
      }

      if (filters.codigo_servico) {
        query = query.where('nfse.codigo_servico', filters.codigo_servico);
      }

      if (filters.situacao_prefeitura) {
        query = query.where('nfse.situacao_prefeitura', filters.situacao_prefeitura);
      }

      // Count total records for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_emissao';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`nfse.${sortField}`, sortOrder);

      const nfses = await query.limit(limit).offset(offset);

      // Get services for each NFSe if requested
      if (req.query.include_services === 'true') {
        for (let nfse of nfses) {
          nfse.servicos = await db('fis_09_nfse_servicos')
            .leftJoin('prd_04_servicos as s', 'fis_09_nfse_servicos.id_servico', 's.id_servico')
            .select(
              'fis_09_nfse_servicos.*',
              's.descricao as servico_descricao',
              's.codigo_cnae'
            )
            .where('id_nfse', nfse.id_nfse);
        }
      }

      res.json({
        success: true,
        data: nfses,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching NFSe:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar notas fiscais de serviços',
        details: error.message
      });
    }
  }

  // Get NFSe by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Get main NFSe data
      const nfse = await db('fis_08_nfse as nfse')
        .leftJoin('cad_01_empresas as e', 'nfse.id_empresa', 'e.id_empresa')
        .leftJoin('cad_03_clientes as c', 'nfse.id_tomador', 'c.id_cliente')
        .leftJoin('cad_05_usuarios as u', 'nfse.id_usuario_criacao', 'u.id_usuario')
        .select(
          'nfse.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'e.endereco as empresa_endereco',
          'e.uf as empresa_uf',
          'e.municipio as empresa_municipio',
          'e.inscricao_municipal as empresa_im',
          'c.nome_razao_social as tomador_nome',
          'c.cnpj_cpf as tomador_documento',
          'c.endereco as tomador_endereco',
          'c.uf as tomador_uf',
          'c.municipio as tomador_municipio',
          'u.nome as criado_por'
        )
        .where('nfse.id_nfse', id)
        .first();

      if (!nfse) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal de serviços não encontrada'
        });
      }

      // Get NFSe services
      nfse.servicos = await db('fis_09_nfse_servicos as ns')
        .leftJoin('prd_04_servicos as s', 'ns.id_servico', 's.id_servico')
        .select(
          'ns.*',
          's.descricao as servico_descricao',
          's.codigo_cnae',
          's.aliquota_iss_padrao'
        )
        .where('ns.id_nfse', id);

      // Get NFSe events (generation, cancellation, etc.)
      nfse.eventos = await db('fis_10_nfse_eventos')
        .where('id_nfse', id)
        .orderBy('data_evento', 'desc');

      res.json({
        success: true,
        data: nfse
      });

    } catch (error) {
      console.error('Error fetching NFSe by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar nota fiscal de serviços',
        details: error.message
      });
    }
  }

  // Create new NFSe
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = nfseSchema.parse(req.body);

      // Generate RPS number for this company
      const lastRps = await trx('fis_08_nfse')
        .where('id_empresa', validatedData.id_empresa)
        .where('serie_rps', validatedData.serie_rps)
        .orderBy('numero_rps', 'desc')
        .first();

      const nextRpsNumber = lastRps ? lastRps.numero_rps + 1 : 1;

      // Create main NFSe record
      const nfseData = {
        ...validatedData,
        numero_rps: nextRpsNumber,
        status: 'DIGITACAO',
        situacao_prefeitura: 'NAO_ENVIADA',
        data_emissao: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const [nfseId] = await trx('fis_08_nfse').insert(nfseData).returning('id_nfse');

      // Insert NFSe services
      if (validatedData.servicos && validatedData.servicos.length > 0) {
        for (let i = 0; i < validatedData.servicos.length; i++) {
          const servico = validatedData.servicos[i];
          
          // Calculate ISS
          const valorServico = servico.quantidade * servico.valor_unitario - (servico.desconto || 0);
          const aliquotaISS = servico.aliquota_iss || 5; // Default 5%
          const valorISS = valorServico * (aliquotaISS / 100);

          await trx('fis_09_nfse_servicos').insert({
            id_nfse: nfseId,
            numero_item: i + 1,
            ...servico,
            valor_servicos: valorServico,
            aliquota_iss: aliquotaISS,
            valor_iss: valorISS,
            created_at: new Date()
          });
        }
      }

      // Log creation event
      await trx('fis_10_nfse_eventos').insert({
        id_nfse: nfseId,
        tipo_evento: 'CRIACAO',
        descricao: 'NFSe criada no sistema',
        data_evento: new Date(),
        id_usuario: req.user?.id || validatedData.id_usuario_criacao
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { 
          id_nfse: nfseId, 
          numero_rps: nextRpsNumber,
          serie_rps: validatedData.serie_rps
        },
        message: 'Nota fiscal de serviços criada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para criação da NFSe',
          details: error.errors
        });
      }

      console.error('Error creating NFSe:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar nota fiscal de serviços',
        details: error.message
      });
    }
  }

  // Update NFSe
  async update(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      
      // Validate input
      const validatedData = nfseUpdateSchema.parse(req.body);

      // Check if NFSe exists and can be updated
      const existingNfse = await trx('fis_08_nfse')
        .where('id_nfse', id)
        .first();

      if (!existingNfse) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal de serviços não encontrada'
        });
      }

      // Check if NFSe can be updated (not generated yet)
      if (existingNfse.situacao_prefeitura === 'AUTORIZADA') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'NFSe autorizada não pode ser alterada'
        });
      }

      // Update main NFSe record
      await trx('fis_08_nfse')
        .where('id_nfse', id)
        .update({
          ...validatedData,
          updated_at: new Date()
        });

      // Update services if provided
      if (validatedData.servicos) {
        // Delete existing services
        await trx('fis_09_nfse_servicos').where('id_nfse', id).del();
        
        // Insert new services
        for (let i = 0; i < validatedData.servicos.length; i++) {
          const servico = validatedData.servicos[i];
          
          // Calculate ISS
          const valorServico = servico.quantidade * servico.valor_unitario - (servico.desconto || 0);
          const aliquotaISS = servico.aliquota_iss || 5;
          const valorISS = valorServico * (aliquotaISS / 100);

          await trx('fis_09_nfse_servicos').insert({
            id_nfse: id,
            numero_item: i + 1,
            ...servico,
            valor_servicos: valorServico,
            aliquota_iss: aliquotaISS,
            valor_iss: valorISS,
            created_at: new Date()
          });
        }
      }

      // Log update event
      await trx('fis_10_nfse_eventos').insert({
        id_nfse: id,
        tipo_evento: 'ALTERACAO',
        descricao: 'NFSe alterada no sistema',
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Nota fiscal de serviços atualizada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para atualização da NFSe',
          details: error.errors
        });
      }

      console.error('Error updating NFSe:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar nota fiscal de serviços',
        details: error.message
      });
    }
  }

  // Send NFSe to Municipal System
  async sendToMunicipal(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;

      const nfse = await trx('fis_08_nfse')
        .where('id_nfse', id)
        .first();

      if (!nfse) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal de serviços não encontrada'
        });
      }

      // Check if NFSe is ready to send
      if (nfse.status !== 'DIGITACAO' && nfse.status !== 'ERRO_PREFEITURA') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'NFSe não está em status válido para envio'
        });
      }

      // Update status to sending
      await trx('fis_08_nfse')
        .where('id_nfse', id)
        .update({
          status: 'ENVIANDO_PREFEITURA',
          data_envio_prefeitura: new Date(),
          updated_at: new Date()
        });

      // Log sending event
      await trx('fis_10_nfse_eventos').insert({
        id_nfse: id,
        tipo_evento: 'ENVIO_PREFEITURA',
        descricao: 'NFSe enviada para sistema municipal',
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      // Here you would integrate with Municipal API
      // For now, we'll simulate the process
      setTimeout(async () => {
        await this.simulateMunicipalResponse(id);
      }, 5000);

      res.json({
        success: true,
        message: 'NFSe enviada para sistema municipal com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error sending NFSe to municipal system:', error);
      res.status(500).json({
        success: false,
        error: 'MUNICIPAL_ERROR',
        message: 'Erro ao enviar NFSe para sistema municipal',
        details: error.message
      });
    }
  }

  // Cancel NFSe
  async cancel(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { motivo_cancelamento } = req.body;

      if (!motivo_cancelamento || motivo_cancelamento.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Motivo de cancelamento deve ter pelo menos 10 caracteres'
        });
      }

      const nfse = await trx('fis_08_nfse')
        .where('id_nfse', id)
        .first();

      if (!nfse) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal de serviços não encontrada'
        });
      }

      // Check if NFSe can be cancelled
      if (nfse.situacao_prefeitura !== 'AUTORIZADA') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Apenas NFSe autorizadas podem ser canceladas'
        });
      }

      // Update status to cancelling
      await trx('fis_08_nfse')
        .where('id_nfse', id)
        .update({
          status: 'CANCELANDO',
          motivo_cancelamento: motivo_cancelamento,
          data_cancelamento: new Date(),
          updated_at: new Date()
        });

      // Log cancellation event
      await trx('fis_10_nfse_eventos').insert({
        id_nfse: id,
        tipo_evento: 'CANCELAMENTO',
        descricao: `Solicitação de cancelamento: ${motivo_cancelamento}`,
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      // Here you would integrate with Municipal cancellation API
      // For now, we'll simulate the process
      setTimeout(async () => {
        await this.simulateCancellationResponse(id);
      }, 3000);

      res.json({
        success: true,
        message: 'Solicitação de cancelamento enviada para sistema municipal'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error cancelling NFSe:', error);
      res.status(500).json({
        success: false,
        error: 'CANCELLATION_ERROR',
        message: 'Erro ao cancelar NFSe',
        details: error.message
      });
    }
  }

  // Get NFSe XML/PDF
  async getDocument(req, res) {
    try {
      const { id } = req.params;
      const { tipo } = req.query; // 'xml' or 'pdf'

      const nfse = await db('fis_08_nfse')
        .where('id_nfse', id)
        .first();

      if (!nfse) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal de serviços não encontrada'
        });
      }

      if (nfse.situacao_prefeitura !== 'AUTORIZADA') {
        return res.status(400).json({
          success: false,
          error: 'DOCUMENT_NOT_AVAILABLE',
          message: 'Documento disponível apenas para NFSe autorizadas'
        });
      }

      if (tipo === 'xml') {
        if (!nfse.xml_nfse) {
          return res.status(400).json({
            success: false,
            error: 'XML_NOT_AVAILABLE',
            message: 'XML não disponível para esta NFSe'
          });
        }

        res.set({
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="NFSe_${nfse.numero_nfse}.xml"`
        });

        res.send(nfse.xml_nfse);
      } else {
        // Generate PDF
        res.json({
          success: true,
          data: {
            url: `/api/fis/nfse/${id}/documento.pdf`,
            message: 'Documento gerado com sucesso'
          }
        });
      }

    } catch (error) {
      console.error('Error getting NFSe document:', error);
      res.status(500).json({
        success: false,
        error: 'DOCUMENT_ERROR',
        message: 'Erro ao obter documento da NFSe',
        details: error.message
      });
    }
  }

  // Get NFSe statistics
  async getStats(req, res) {
    try {
      const filters = {
        id_empresa: req.query.id_empresa || '',
        periodo: req.query.periodo || '30' // days
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      let query = db('fis_08_nfse');
      
      if (filters.id_empresa) {
        query = query.where('id_empresa', filters.id_empresa);
      }

      // Total NFSe count
      const totalNfse = await query.clone()
        .count('* as count')
        .first();

      // NFSe by status
      const nfseByStatus = await query.clone()
        .select('situacao_prefeitura')
        .count('* as count')
        .groupBy('situacao_prefeitura');

      // NFSe in period
      const nfseInPeriod = await query.clone()
        .where('data_emissao', '>=', dateFrom)
        .count('* as count')
        .first();

      // Total value and ISS
      const totals = await query.clone()
        .sum('valor_total_servicos as total_servicos')
        .sum('valor_total_iss as total_iss')
        .first();

      // By service type
      const byService = await query.clone()
        .join('fis_09_nfse_servicos as ns', 'fis_08_nfse.id_nfse', 'ns.id_nfse')
        .select('ns.codigo_servico')
        .count('* as count')
        .sum('ns.valor_servicos as valor')
        .groupBy('ns.codigo_servico')
        .limit(10);

      res.json({
        success: true,
        data: {
          total_nfse: parseInt(totalNfse.count),
          nfse_periodo: parseInt(nfseInPeriod.count),
          valor_total_servicos: parseFloat(totals.total_servicos) || 0,
          valor_total_iss: parseFloat(totals.total_iss) || 0,
          por_status: nfseByStatus.map(s => ({
            status: s.situacao_prefeitura,
            quantidade: parseInt(s.count)
          })),
          por_servico: byService.map(s => ({
            codigo_servico: s.codigo_servico,
            quantidade: parseInt(s.count),
            valor: parseFloat(s.valor)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching NFSe stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas de NFSe',
        details: error.message
      });
    }
  }

  // List service codes
  async getServiceCodes(req, res) {
    try {
      const search = req.query.search || '';
      
      let query = db('fis_11_codigos_servico')
        .select('codigo', 'descricao', 'aliquota_iss')
        .where('ativo', true);

      if (search) {
        query = query.where(function() {
          this.where('codigo', 'ilike', `%${search}%`)
              .orWhere('descricao', 'ilike', `%${search}%`);
        });
      }

      const serviceCodes = await query
        .orderBy('codigo')
        .limit(100);

      res.json({
        success: true,
        data: serviceCodes
      });

    } catch (error) {
      console.error('Error fetching service codes:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar códigos de serviço',
        details: error.message
      });
    }
  }

  // Simulate Municipal system response (for demo purposes)
  async simulateMunicipalResponse(nfseId) {
    try {
      // Generate NFSe number
      const nfseNumber = Math.floor(Math.random() * 1000000) + 1000000;

      // Simulate authorization
      await db('fis_08_nfse')
        .where('id_nfse', nfseId)
        .update({
          status: 'AUTORIZADA',
          situacao_prefeitura: 'AUTORIZADA',
          numero_nfse: nfseNumber,
          codigo_verificacao: `${Date.now()}`.slice(-8),
          data_autorizacao: new Date(),
          updated_at: new Date()
        });

      // Log authorization event
      await db('fis_10_nfse_eventos').insert({
        id_nfse: nfseId,
        tipo_evento: 'AUTORIZACAO',
        descricao: 'NFSe autorizada pelo sistema municipal',
        data_evento: new Date(),
        numero_nfse: nfseNumber
      });

    } catch (error) {
      console.error('Error in municipal simulation:', error);
    }
  }

  // Simulate cancellation response (for demo purposes)
  async simulateCancellationResponse(nfseId) {
    try {
      await db('fis_08_nfse')
        .where('id_nfse', nfseId)
        .update({
          status: 'CANCELADA',
          situacao_prefeitura: 'CANCELADA',
          updated_at: new Date()
        });

      // Log cancellation confirmation
      await db('fis_10_nfse_eventos').insert({
        id_nfse: nfseId,
        tipo_evento: 'CANCELAMENTO_CONFIRMADO',
        descricao: 'Cancelamento confirmado pelo sistema municipal',
        data_evento: new Date()
      });

    } catch (error) {
      console.error('Error in cancellation simulation:', error);
    }
  }
}

module.exports = new NFSeController();