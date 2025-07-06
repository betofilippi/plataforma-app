const db = require('../../../src/database/connection');
const { nfeSchema, nfeUpdateSchema } = require('../services/validationService');
const { z } = require('zod');

// NFe Controller - Electronic Invoices Management for Brazilian Tax Compliance
class NFeController {
  // Get all NFe with advanced filtering and pagination
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
        ambiente: req.query.ambiente || '',
        situacao_sefaz: req.query.situacao_sefaz || ''
      };

      // Base query with joins
      let query = db('fis_03_nfe as nfe')
        .leftJoin('cad_01_empresas as e', 'nfe.id_empresa', 'e.id_empresa')
        .leftJoin('cad_03_clientes as c', 'nfe.id_destinatario', 'c.id_cliente')
        .leftJoin('cad_05_usuarios as u', 'nfe.id_usuario_criacao', 'u.id_usuario')
        .select(
          'nfe.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'c.nome_razao_social as destinatario_nome',
          'c.cnpj_cpf as destinatario_documento',
          'u.nome as criado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('nfe.numero_nf', 'ilike', `%${filters.search}%`)
              .orWhere('nfe.chave_acesso', 'ilike', `%${filters.search}%`)
              .orWhere('c.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('c.cnpj_cpf', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('nfe.status', filters.status);
      }

      if (filters.id_empresa) {
        query = query.where('nfe.id_empresa', filters.id_empresa);
      }

      if (filters.id_cliente) {
        query = query.where('nfe.id_destinatario', filters.id_cliente);
      }

      if (filters.data_inicial && filters.data_final) {
        query = query.whereBetween('nfe.data_emissao', [filters.data_inicial, filters.data_final]);
      } else if (filters.data_inicial) {
        query = query.where('nfe.data_emissao', '>=', filters.data_inicial);
      } else if (filters.data_final) {
        query = query.where('nfe.data_emissao', '<=', filters.data_final);
      }

      if (filters.ambiente) {
        query = query.where('nfe.ambiente_sefaz', filters.ambiente);
      }

      if (filters.situacao_sefaz) {
        query = query.where('nfe.situacao_sefaz', filters.situacao_sefaz);
      }

      // Count total records for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_emissao';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`nfe.${sortField}`, sortOrder);

      const nfes = await query.limit(limit).offset(offset);

      // Get items for each NFe if requested
      if (req.query.include_items === 'true') {
        for (let nfe of nfes) {
          nfe.itens = await db('fis_04_nfe_itens')
            .leftJoin('prd_03_produtos as p', 'fis_04_nfe_itens.id_produto', 'p.id_produto')
            .select(
              'fis_04_nfe_itens.*',
              'p.nome as produto_nome',
              'p.codigo_barras'
            )
            .where('id_nfe', nfe.id_nfe);
        }
      }

      res.json({
        success: true,
        data: nfes,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching NFe:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar notas fiscais eletrônicas',
        details: error.message
      });
    }
  }

  // Get NFe by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Get main NFe data
      const nfe = await db('fis_03_nfe as nfe')
        .leftJoin('cad_01_empresas as e', 'nfe.id_empresa', 'e.id_empresa')
        .leftJoin('cad_03_clientes as c', 'nfe.id_destinatario', 'c.id_cliente')
        .leftJoin('cad_05_usuarios as u', 'nfe.id_usuario_criacao', 'u.id_usuario')
        .select(
          'nfe.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'e.endereco as empresa_endereco',
          'e.uf as empresa_uf',
          'e.municipio as empresa_municipio',
          'e.inscricao_estadual as empresa_ie',
          'c.nome_razao_social as destinatario_nome',
          'c.cnpj_cpf as destinatario_documento',
          'c.endereco as destinatario_endereco',
          'c.uf as destinatario_uf',
          'c.municipio as destinatario_municipio',
          'c.inscricao_estadual as destinatario_ie',
          'u.nome as criado_por'
        )
        .where('nfe.id_nfe', id)
        .first();

      if (!nfe) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal eletrônica não encontrada'
        });
      }

      // Get NFe items
      nfe.itens = await db('fis_04_nfe_itens as ni')
        .leftJoin('prd_03_produtos as p', 'ni.id_produto', 'p.id_produto')
        .select(
          'ni.*',
          'p.nome as produto_nome',
          'p.codigo_barras',
          'p.ncm',
          'p.unidade_medida'
        )
        .where('ni.id_nfe', id);

      // Get NFe events (authorization, cancellation, etc.)
      nfe.eventos = await db('fis_05_nfe_eventos')
        .where('id_nfe', id)
        .orderBy('data_evento', 'desc');

      // Get transport information if exists
      nfe.transporte = await db('fis_06_nfe_transporte')
        .where('id_nfe', id)
        .first();

      // Get payment information if exists
      nfe.pagamentos = await db('fis_07_nfe_pagamentos')
        .where('id_nfe', id);

      res.json({
        success: true,
        data: nfe
      });

    } catch (error) {
      console.error('Error fetching NFe by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar nota fiscal eletrônica',
        details: error.message
      });
    }
  }

  // Create new NFe
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = nfeSchema.parse(req.body);

      // Generate sequential number for this company
      const lastNfe = await trx('fis_03_nfe')
        .where('id_empresa', validatedData.id_empresa)
        .where('serie', validatedData.serie)
        .orderBy('numero_nf', 'desc')
        .first();

      const nextNumber = lastNfe ? lastNfe.numero_nf + 1 : 1;

      // Create main NFe record
      const nfeData = {
        ...validatedData,
        numero_nf: nextNumber,
        status: 'DIGITACAO',
        situacao_sefaz: 'NAO_ENVIADA',
        ambiente_sefaz: process.env.NFE_AMBIENTE || 'HOMOLOGACAO',
        data_emissao: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const [nfeId] = await trx('fis_03_nfe').insert(nfeData).returning('id_nfe');

      // Insert NFe items
      if (validatedData.itens && validatedData.itens.length > 0) {
        for (let i = 0; i < validatedData.itens.length; i++) {
          const item = validatedData.itens[i];
          await trx('fis_04_nfe_itens').insert({
            id_nfe: nfeId,
            numero_item: i + 1,
            ...item,
            created_at: new Date()
          });
        }
      }

      // Insert transport information if provided
      if (validatedData.transporte) {
        await trx('fis_06_nfe_transporte').insert({
          id_nfe: nfeId,
          ...validatedData.transporte,
          created_at: new Date()
        });
      }

      // Insert payment information if provided
      if (validatedData.pagamentos && validatedData.pagamentos.length > 0) {
        for (const pagamento of validatedData.pagamentos) {
          await trx('fis_07_nfe_pagamentos').insert({
            id_nfe: nfeId,
            ...pagamento,
            created_at: new Date()
          });
        }
      }

      // Log creation event
      await trx('fis_05_nfe_eventos').insert({
        id_nfe: nfeId,
        tipo_evento: 'CRIACAO',
        descricao: 'NFe criada no sistema',
        data_evento: new Date(),
        id_usuario: req.user?.id || validatedData.id_usuario_criacao
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { 
          id_nfe: nfeId, 
          numero_nf: nextNumber,
          serie: validatedData.serie
        },
        message: 'Nota fiscal eletrônica criada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para criação da NFe',
          details: error.errors
        });
      }

      console.error('Error creating NFe:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar nota fiscal eletrônica',
        details: error.message
      });
    }
  }

  // Update NFe
  async update(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      
      // Validate input
      const validatedData = nfeUpdateSchema.parse(req.body);

      // Check if NFe exists and can be updated
      const existingNfe = await trx('fis_03_nfe')
        .where('id_nfe', id)
        .first();

      if (!existingNfe) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal eletrônica não encontrada'
        });
      }

      // Check if NFe can be updated (not authorized yet)
      if (existingNfe.situacao_sefaz === 'AUTORIZADA') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'NFe autorizada não pode ser alterada'
        });
      }

      // Update main NFe record
      await trx('fis_03_nfe')
        .where('id_nfe', id)
        .update({
          ...validatedData,
          updated_at: new Date()
        });

      // Update items if provided
      if (validatedData.itens) {
        // Delete existing items
        await trx('fis_04_nfe_itens').where('id_nfe', id).del();
        
        // Insert new items
        for (let i = 0; i < validatedData.itens.length; i++) {
          const item = validatedData.itens[i];
          await trx('fis_04_nfe_itens').insert({
            id_nfe: id,
            numero_item: i + 1,
            ...item,
            created_at: new Date()
          });
        }
      }

      // Log update event
      await trx('fis_05_nfe_eventos').insert({
        id_nfe: id,
        tipo_evento: 'ALTERACAO',
        descricao: 'NFe alterada no sistema',
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Nota fiscal eletrônica atualizada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para atualização da NFe',
          details: error.errors
        });
      }

      console.error('Error updating NFe:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar nota fiscal eletrônica',
        details: error.message
      });
    }
  }

  // Send NFe to SEFAZ
  async sendToSefaz(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;

      const nfe = await trx('fis_03_nfe')
        .where('id_nfe', id)
        .first();

      if (!nfe) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal eletrônica não encontrada'
        });
      }

      // Check if NFe is ready to send
      if (nfe.status !== 'DIGITACAO' && nfe.status !== 'ERRO_SEFAZ') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'NFe não está em status válido para envio'
        });
      }

      // Generate access key if not exists
      let chaveAcesso = nfe.chave_acesso;
      if (!chaveAcesso) {
        chaveAcesso = await this.generateAccessKey(nfe);
      }

      // Update status to sending
      await trx('fis_03_nfe')
        .where('id_nfe', id)
        .update({
          status: 'ENVIANDO_SEFAZ',
          chave_acesso: chaveAcesso,
          data_envio_sefaz: new Date(),
          updated_at: new Date()
        });

      // Log sending event
      await trx('fis_05_nfe_eventos').insert({
        id_nfe: id,
        tipo_evento: 'ENVIO_SEFAZ',
        descricao: 'NFe enviada para SEFAZ',
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      // Here you would integrate with SEFAZ API
      // For now, we'll simulate the process
      setTimeout(async () => {
        await this.simulateSefazResponse(id, chaveAcesso);
      }, 5000);

      res.json({
        success: true,
        data: { chave_acesso: chaveAcesso },
        message: 'NFe enviada para SEFAZ com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error sending NFe to SEFAZ:', error);
      res.status(500).json({
        success: false,
        error: 'SEFAZ_ERROR',
        message: 'Erro ao enviar NFe para SEFAZ',
        details: error.message
      });
    }
  }

  // Cancel NFe
  async cancel(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { justificativa } = req.body;

      if (!justificativa || justificativa.length < 15) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Justificativa deve ter pelo menos 15 caracteres'
        });
      }

      const nfe = await trx('fis_03_nfe')
        .where('id_nfe', id)
        .first();

      if (!nfe) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal eletrônica não encontrada'
        });
      }

      // Check if NFe can be cancelled
      if (nfe.situacao_sefaz !== 'AUTORIZADA') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Apenas NFe autorizadas podem ser canceladas'
        });
      }

      // Update status to cancelling
      await trx('fis_03_nfe')
        .where('id_nfe', id)
        .update({
          status: 'CANCELANDO',
          justificativa_cancelamento: justificativa,
          data_cancelamento: new Date(),
          updated_at: new Date()
        });

      // Log cancellation event
      await trx('fis_05_nfe_eventos').insert({
        id_nfe: id,
        tipo_evento: 'CANCELAMENTO',
        descricao: `Solicitação de cancelamento: ${justificativa}`,
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      // Here you would integrate with SEFAZ cancellation API
      // For now, we'll simulate the process
      setTimeout(async () => {
        await this.simulateCancellationResponse(id);
      }, 3000);

      res.json({
        success: true,
        message: 'Solicitação de cancelamento enviada para SEFAZ'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error cancelling NFe:', error);
      res.status(500).json({
        success: false,
        error: 'CANCELLATION_ERROR',
        message: 'Erro ao cancelar NFe',
        details: error.message
      });
    }
  }

  // Get NFe XML
  async getXML(req, res) {
    try {
      const { id } = req.params;

      const nfe = await db('fis_03_nfe')
        .where('id_nfe', id)
        .first();

      if (!nfe) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal eletrônica não encontrada'
        });
      }

      if (!nfe.xml_assinado) {
        return res.status(400).json({
          success: false,
          error: 'XML_NOT_AVAILABLE',
          message: 'XML não disponível para esta NFe'
        });
      }

      res.set({
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="NFe_${nfe.chave_acesso}.xml"`
      });

      res.send(nfe.xml_assinado);

    } catch (error) {
      console.error('Error getting NFe XML:', error);
      res.status(500).json({
        success: false,
        error: 'XML_ERROR',
        message: 'Erro ao obter XML da NFe',
        details: error.message
      });
    }
  }

  // Get NFe DANFE (PDF)
  async getDanfe(req, res) {
    try {
      const { id } = req.params;

      const nfe = await db('fis_03_nfe')
        .where('id_nfe', id)
        .first();

      if (!nfe) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nota fiscal eletrônica não encontrada'
        });
      }

      if (nfe.situacao_sefaz !== 'AUTORIZADA') {
        return res.status(400).json({
          success: false,
          error: 'DANFE_NOT_AVAILABLE',
          message: 'DANFE disponível apenas para NFe autorizadas'
        });
      }

      // Here you would generate the DANFE PDF
      // For now, we'll return a placeholder response
      res.json({
        success: true,
        data: {
          url: `/api/fis/nfe/${id}/danfe.pdf`,
          message: 'DANFE gerada com sucesso'
        }
      });

    } catch (error) {
      console.error('Error generating DANFE:', error);
      res.status(500).json({
        success: false,
        error: 'DANFE_ERROR',
        message: 'Erro ao gerar DANFE',
        details: error.message
      });
    }
  }

  // Get NFe statistics
  async getStats(req, res) {
    try {
      const filters = {
        id_empresa: req.query.id_empresa || '',
        periodo: req.query.periodo || '30' // days
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      let query = db('fis_03_nfe');
      
      if (filters.id_empresa) {
        query = query.where('id_empresa', filters.id_empresa);
      }

      // Total NFe count
      const totalNfe = await query.clone()
        .count('* as count')
        .first();

      // NFe by status
      const nfeByStatus = await query.clone()
        .select('situacao_sefaz')
        .count('* as count')
        .groupBy('situacao_sefaz');

      // NFe in period
      const nfeInPeriod = await query.clone()
        .where('data_emissao', '>=', dateFrom)
        .count('* as count')
        .first();

      // Total value
      const totalValue = await query.clone()
        .sum('valor_total as total')
        .first();

      res.json({
        success: true,
        data: {
          total_nfe: parseInt(totalNfe.count),
          nfe_periodo: parseInt(nfeInPeriod.count),
          valor_total: parseFloat(totalValue.total) || 0,
          por_status: nfeByStatus.map(s => ({
            status: s.situacao_sefaz,
            quantidade: parseInt(s.count)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching NFe stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas de NFe',
        details: error.message
      });
    }
  }

  // Helper method to generate access key
  async generateAccessKey(nfe) {
    // NFe access key format: UF + YYMM + CNPJ + MOD + SER + NNNNNNNN + TPAMB + CNNNNNN + DV
    // This is a simplified version - in production you'd use a proper algorithm
    const uf = '35'; // São Paulo - should come from company data
    const yyMM = new Date().toISOString().slice(2, 7).replace('-', '');
    const cnpj = '12345678000195'; // Should come from company data
    const mod = '55'; // NFe model
    const ser = nfe.serie.toString().padStart(3, '0');
    const nf = nfe.numero_nf.toString().padStart(9, '0');
    const tpAmb = nfe.ambiente_sefaz === 'PRODUCAO' ? '1' : '2';
    const cNF = Math.random().toString().slice(2, 9);
    
    const baseKey = uf + yyMM + cnpj + mod + ser + nf + tpAmb + cNF;
    const dv = this.calculateVerificationDigit(baseKey);
    
    return baseKey + dv;
  }

  // Helper method to calculate verification digit
  calculateVerificationDigit(key) {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3];
    let sum = 0;
    
    for (let i = 0; i < key.length; i++) {
      sum += parseInt(key[i]) * weights[i];
    }
    
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  // Simulate SEFAZ response (for demo purposes)
  async simulateSefazResponse(nfeId, chaveAcesso) {
    try {
      // Simulate authorization
      await db('fis_03_nfe')
        .where('id_nfe', nfeId)
        .update({
          status: 'AUTORIZADA',
          situacao_sefaz: 'AUTORIZADA',
          protocolo_autorizacao: `${Date.now()}`,
          data_autorizacao: new Date(),
          updated_at: new Date()
        });

      // Log authorization event
      await db('fis_05_nfe_eventos').insert({
        id_nfe: nfeId,
        tipo_evento: 'AUTORIZACAO',
        descricao: 'NFe autorizada pela SEFAZ',
        data_evento: new Date(),
        protocolo: `${Date.now()}`
      });

    } catch (error) {
      console.error('Error in SEFAZ simulation:', error);
    }
  }

  // Simulate cancellation response (for demo purposes)
  async simulateCancellationResponse(nfeId) {
    try {
      await db('fis_03_nfe')
        .where('id_nfe', nfeId)
        .update({
          status: 'CANCELADA',
          situacao_sefaz: 'CANCELADA',
          updated_at: new Date()
        });

      // Log cancellation confirmation
      await db('fis_05_nfe_eventos').insert({
        id_nfe: nfeId,
        tipo_evento: 'CANCELAMENTO_CONFIRMADO',
        descricao: 'Cancelamento confirmado pela SEFAZ',
        data_evento: new Date()
      });

    } catch (error) {
      console.error('Error in cancellation simulation:', error);
    }
  }
}

module.exports = new NFeController();