const db = require('../../../src/database/connection');

/**
 * Service layer for rental contracts (loc_01_contratos_locacao)
 * Handles all database operations for rental contract management
 */

class RentalContractsService {
  constructor() {
    this.tableName = 'loc_01_contratos_locacao';
  }

  /**
   * Get all rental contracts with pagination and filters
   */
  async getAllRentalContracts({
    page = 1,
    limit = 10,
    search = '',
    status = null,
    cliente_id = null,
    equipment_type = null,
    sort = 'numero_contrato',
    order = 'desc'
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let query = db(this.tableName)
        .select([
          'id_contrato',
          'numero_contrato',
          'cliente_id',
          'equipamento_id',
          'data_inicio',
          'data_fim',
          'valor_diario',
          'valor_mensal',
          'valor_total',
          'forma_pagamento',
          'status',
          'permite_renovacao',
          'auto_renovacao',
          'responsavel_locacao',
          'requer_caucao',
          'valor_caucao',
          'status_caucao',
          'created_at',
          'updated_at'
        ])
        .leftJoin('cad_03_clientes as cliente', 'cliente.id_cliente', 'loc_01_contratos_locacao.cliente_id')
        .leftJoin('loc_02_equipamentos as equip', 'equip.id_equipamento', 'loc_01_contratos_locacao.equipamento_id')
        .select([
          'cliente.nome_razao_social as cliente_nome',
          'equip.nome_equipamento',
          'equip.codigo_equipamento'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('numero_contrato', 'ilike', `%${search}%`)
              .orWhere('cliente.nome_razao_social', 'ilike', `%${search}%`)
              .orWhere('equip.nome_equipamento', 'ilike', `%${search}%`)
              .orWhere('responsavel_locacao', 'ilike', `%${search}%`);
        });
      }

      if (status) {
        query = query.where('loc_01_contratos_locacao.status', status);
      }

      if (cliente_id) {
        query = query.where('loc_01_contratos_locacao.cliente_id', cliente_id);
      }

      if (equipment_type) {
        query = query.where('equip.tipo_equipamento', equipment_type);
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('loc_01_contratos_locacao.id_contrato as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = [
        'numero_contrato', 'data_inicio', 'data_fim', 'valor_total', 
        'status', 'cliente_nome', 'created_at'
      ];
      
      if (validSortFields.includes(sort)) {
        if (sort === 'cliente_nome') {
          query = query.orderBy('cliente.nome_razao_social', order);
        } else {
          query = query.orderBy(`loc_01_contratos_locacao.${sort}`, order);
        }
      } else {
        query = query.orderBy('loc_01_contratos_locacao.numero_contrato', 'desc');
      }

      const contracts = await query.limit(limit).offset(offset);

      return {
        data: contracts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching rental contracts:', error);
      throw new Error('Erro ao buscar contratos de locação: ' + error.message);
    }
  }

  /**
   * Get rental contract by ID
   */
  async getRentalContractById(id) {
    try {
      const contract = await db(this.tableName)
        .select('*')
        .where('id_contrato', id)
        .leftJoin('cad_03_clientes as cliente', 'cliente.id_cliente', 'loc_01_contratos_locacao.cliente_id')
        .leftJoin('loc_02_equipamentos as equip', 'equip.id_equipamento', 'loc_01_contratos_locacao.equipamento_id')
        .select([
          'loc_01_contratos_locacao.*',
          'cliente.nome_razao_social as cliente_nome',
          'cliente.cnpj_cpf as cliente_documento',
          'cliente.telefone as cliente_telefone',
          'cliente.email as cliente_email',
          'equip.nome_equipamento',
          'equip.codigo_equipamento',
          'equip.tipo_equipamento',
          'equip.marca',
          'equip.modelo'
        ])
        .first();

      if (!contract) {
        throw new Error('Contrato de locação não encontrado');
      }

      // Add audit log
      await this.addAuditLog(id, 'VIEW', 'Consulta do contrato');

      return contract;
    } catch (error) {
      console.error('Error fetching rental contract by ID:', error);
      throw new Error('Erro ao buscar contrato de locação: ' + error.message);
    }
  }

  /**
   * Create new rental contract
   */
  async createRentalContract(contractData) {
    const trx = await db.transaction();
    try {
      // Validate equipment availability
      const equipment = await trx('loc_02_equipamentos')
        .select('status')
        .where('id_equipamento', contractData.equipamento_id)
        .first();

      if (!equipment) {
        throw new Error('Equipamento não encontrado');
      }

      if (equipment.status !== 'DISPONIVEL') {
        throw new Error('Equipamento não está disponível para locação');
      }

      // Check for contract number uniqueness
      const existingContract = await trx(this.tableName)
        .select('id_contrato')
        .where('numero_contrato', contractData.numero_contrato)
        .first();

      if (existingContract) {
        throw new Error('Já existe um contrato com este número');
      }

      // Calculate total value if not provided
      if (!contractData.valor_total) {
        const days = Math.ceil((new Date(contractData.data_fim) - new Date(contractData.data_inicio)) / (1000 * 60 * 60 * 24));
        contractData.valor_total = contractData.valor_diario * days;
      }

      // Insert rental contract
      const [newContract] = await trx(this.tableName)
        .insert({
          ...contractData,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('*');

      // Update equipment status
      await trx('loc_02_equipamentos')
        .where('id_equipamento', contractData.equipamento_id)
        .update({
          status: 'LOCADO',
          updated_at: db.fn.now()
        });

      // Add audit log
      await this.addAuditLog(newContract.id_contrato, 'CREATE', 'Contrato criado', trx);

      await trx.commit();
      return newContract;
    } catch (error) {
      await trx.rollback();
      console.error('Error creating rental contract:', error);
      throw new Error('Erro ao criar contrato de locação: ' + error.message);
    }
  }

  /**
   * Update rental contract
   */
  async updateRentalContract(id, updateData) {
    const trx = await db.transaction();
    try {
      const existingContract = await trx(this.tableName)
        .select('*')
        .where('id_contrato', id)
        .first();

      if (!existingContract) {
        throw new Error('Contrato de locação não encontrado');
      }

      // Check if contract number is being changed and if it's unique
      if (updateData.numero_contrato && updateData.numero_contrato !== existingContract.numero_contrato) {
        const existingNumber = await trx(this.tableName)
          .select('id_contrato')
          .where('numero_contrato', updateData.numero_contrato)
          .whereNot('id_contrato', id)
          .first();

        if (existingNumber) {
          throw new Error('Já existe um contrato com este número');
        }
      }

      // Update contract
      const [updatedContract] = await trx(this.tableName)
        .where('id_contrato', id)
        .update({
          ...updateData,
          updated_at: db.fn.now()
        })
        .returning('*');

      // Add audit log
      await this.addAuditLog(id, 'UPDATE', 'Contrato atualizado', trx);

      await trx.commit();
      return updatedContract;
    } catch (error) {
      await trx.rollback();
      console.error('Error updating rental contract:', error);
      throw new Error('Erro ao atualizar contrato de locação: ' + error.message);
    }
  }

  /**
   * Delete rental contract
   */
  async deleteRentalContract(id) {
    const trx = await db.transaction();
    try {
      const contract = await trx(this.tableName)
        .select('*')
        .where('id_contrato', id)
        .first();

      if (!contract) {
        throw new Error('Contrato de locação não encontrado');
      }

      // Check if contract can be deleted (only if not active)
      if (contract.status === 'ATIVO') {
        throw new Error('Não é possível excluir um contrato ativo');
      }

      // Delete contract
      await trx(this.tableName)
        .where('id_contrato', id)
        .del();

      // Update equipment status back to available if it was locado
      if (contract.status === 'FINALIZADO') {
        await trx('loc_02_equipamentos')
          .where('id_equipamento', contract.equipamento_id)
          .update({
            status: 'DISPONIVEL',
            updated_at: db.fn.now()
          });
      }

      // Add audit log
      await this.addAuditLog(id, 'DELETE', 'Contrato excluído', trx);

      await trx.commit();
      return { message: 'Contrato de locação excluído com sucesso' };
    } catch (error) {
      await trx.rollback();
      console.error('Error deleting rental contract:', error);
      throw new Error('Erro ao excluir contrato de locação: ' + error.message);
    }
  }

  /**
   * Get rental contract statistics
   */
  async getRentalContractStats() {
    try {
      const stats = await db(this.tableName)
        .select(
          db.raw('COUNT(*) as total_contratos'),
          db.raw('COUNT(*) FILTER (WHERE status = \'ATIVO\') as contratos_ativos'),
          db.raw('COUNT(*) FILTER (WHERE status = \'FINALIZADO\') as contratos_finalizados'),
          db.raw('COUNT(*) FILTER (WHERE status = \'CANCELADO\') as contratos_cancelados'),
          db.raw('SUM(valor_total) as receita_total'),
          db.raw('SUM(valor_total) FILTER (WHERE status = \'ATIVO\') as receita_ativa'),
          db.raw('AVG(valor_diario) as valor_medio_diario')
        )
        .first();

      const monthlyStats = await db(this.tableName)
        .select(
          db.raw('DATE_TRUNC(\'month\', created_at) as mes'),
          db.raw('COUNT(*) as contratos_mes'),
          db.raw('SUM(valor_total) as receita_mes')
        )
        .where('created_at', '>=', db.raw('CURRENT_DATE - INTERVAL \'12 months\''))
        .groupBy(db.raw('DATE_TRUNC(\'month\', created_at)'))
        .orderBy('mes', 'desc');

      const equipmentStats = await db(this.tableName)
        .leftJoin('loc_02_equipamentos as equip', 'equip.id_equipamento', 'loc_01_contratos_locacao.equipamento_id')
        .select(
          'equip.tipo_equipamento',
          db.raw('COUNT(*) as total_locacoes'),
          db.raw('SUM(valor_total) as receita_tipo')
        )
        .groupBy('equip.tipo_equipamento')
        .orderBy('total_locacoes', 'desc');

      return {
        geral: stats,
        mensal: monthlyStats,
        por_tipo_equipamento: equipmentStats
      };
    } catch (error) {
      console.error('Error fetching rental contract stats:', error);
      throw new Error('Erro ao buscar estatísticas: ' + error.message);
    }
  }

  /**
   * Renew rental contract
   */
  async renewRentalContract(id, renewalData) {
    const trx = await db.transaction();
    try {
      const contract = await trx(this.tableName)
        .select('*')
        .where('id_contrato', id)
        .first();

      if (!contract) {
        throw new Error('Contrato de locação não encontrado');
      }

      if (!contract.permite_renovacao) {
        throw new Error('Este contrato não permite renovação');
      }

      if (contract.status !== 'ATIVO') {
        throw new Error('Apenas contratos ativos podem ser renovados');
      }

      // Calculate new total value
      const newDays = Math.ceil((new Date(renewalData.nova_data_fim) - new Date(contract.data_fim)) / (1000 * 60 * 60 * 24));
      const newValue = (contract.valor_diario + (renewalData.ajuste_valor || 0)) * newDays;

      // Update contract
      const [updatedContract] = await trx(this.tableName)
        .where('id_contrato', id)
        .update({
          data_fim: renewalData.nova_data_fim,
          valor_diario: contract.valor_diario + (renewalData.ajuste_valor || 0),
          valor_total: contract.valor_total + newValue,
          updated_at: db.fn.now()
        })
        .returning('*');

      // Add audit log
      await this.addAuditLog(id, 'RENEW', `Contrato renovado até ${renewalData.nova_data_fim}`, trx);

      await trx.commit();
      return {
        message: 'Contrato renovado com sucesso',
        contract: updatedContract
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error renewing rental contract:', error);
      throw new Error('Erro ao renovar contrato: ' + error.message);
    }
  }

  /**
   * Calculate rental billing
   */
  async calculateRentalBilling(id, period) {
    try {
      const contract = await this.getRentalContractById(id);
      
      const startDate = period.periodo_inicio ? new Date(period.periodo_inicio) : new Date(contract.data_inicio);
      const endDate = period.periodo_fim ? new Date(period.periodo_fim) : new Date(contract.data_fim);
      
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const totalValue = contract.valor_diario * days;
      
      const billing = {
        contrato: contract.numero_contrato,
        periodo: {
          inicio: startDate.toISOString().split('T')[0],
          fim: endDate.toISOString().split('T')[0],
          dias: days
        },
        valores: {
          valor_diario: contract.valor_diario,
          valor_periodo: totalValue,
          taxa_entrega: contract.taxa_entrega || 0,
          taxa_devolucao: contract.taxa_devolucao || 0,
          valor_total: totalValue + (contract.taxa_entrega || 0) + (contract.taxa_devolucao || 0)
        },
        caucao: {
          requer: contract.requer_caucao,
          valor: contract.valor_caucao || 0,
          status: contract.status_caucao
        }
      };
      
      return billing;
    } catch (error) {
      console.error('Error calculating rental billing:', error);
      throw new Error('Erro ao calcular faturamento: ' + error.message);
    }
  }

  /**
   * Get contracts expiring soon
   */
  async getExpiringContracts(days = 30) {
    try {
      const contracts = await db(this.tableName)
        .select([
          'id_contrato',
          'numero_contrato',
          'data_fim',
          'valor_total',
          'permite_renovacao',
          'auto_renovacao',
          'responsavel_locacao'
        ])
        .leftJoin('cad_03_clientes as cliente', 'cliente.id_cliente', 'loc_01_contratos_locacao.cliente_id')
        .leftJoin('loc_02_equipamentos as equip', 'equip.id_equipamento', 'loc_01_contratos_locacao.equipamento_id')
        .select([
          'cliente.nome_razao_social as cliente_nome',
          'cliente.telefone as cliente_telefone',
          'equip.nome_equipamento'
        ])
        .where('loc_01_contratos_locacao.status', 'ATIVO')
        .where('data_fim', '<=', db.raw(`CURRENT_DATE + INTERVAL '${days} days'`))
        .orderBy('data_fim', 'asc');

      return contracts;
    } catch (error) {
      console.error('Error fetching expiring contracts:', error);
      throw new Error('Erro ao buscar contratos vencendo: ' + error.message);
    }
  }

  /**
   * Add audit log
   */
  async addAuditLog(contractId, action, description, trx = db) {
    try {
      await trx('loc_audit_logs').insert({
        tabela: this.tableName,
        registro_id: contractId,
        acao: action,
        descricao: description,
        created_at: db.fn.now()
      });
    } catch (error) {
      console.error('Error adding audit log:', error);
      // Don't throw error here to avoid breaking main operations
    }
  }
}

module.exports = new RentalContractsService();
