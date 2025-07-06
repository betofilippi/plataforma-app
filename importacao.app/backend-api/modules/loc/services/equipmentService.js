const db = require('../../../src/database/connection');

/**
 * Service layer for equipment (loc_02_equipamentos)
 * Handles all database operations for equipment management
 */

class EquipmentService {
  constructor() {
    this.tableName = 'loc_02_equipamentos';
  }

  /**
   * Get all equipment with pagination and filters
   */
  async getAllEquipment({
    page = 1,
    limit = 10,
    search = '',
    status = null,
    tipo_equipamento = null,
    disponivel = null,
    sort = 'codigo_equipamento',
    order = 'asc'
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let query = db(this.tableName)
        .select([
          'id_equipamento',
          'codigo_equipamento',
          'nome_equipamento',
          'descricao',
          'tipo_equipamento',
          'marca',
          'modelo',
          'numero_serie',
          'ano_fabricacao',
          'valor_locacao_diaria',
          'valor_locacao_mensal',
          'status',
          'condicao',
          'localizacao_atual',
          'responsavel_equipamento',
          'proxima_manutencao',
          'ativo',
          'created_at',
          'updated_at'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('codigo_equipamento', 'ilike', `%${search}%`)
              .orWhere('nome_equipamento', 'ilike', `%${search}%`)
              .orWhere('marca', 'ilike', `%${search}%`)
              .orWhere('modelo', 'ilike', `%${search}%`)
              .orWhere('numero_serie', 'ilike', `%${search}%`);
        });
      }

      if (status) {
        query = query.where('status', status);
      }

      if (tipo_equipamento) {
        query = query.where('tipo_equipamento', tipo_equipamento);
      }

      if (disponivel !== null) {
        if (disponivel) {
          query = query.where('status', 'DISPONIVEL').where('ativo', true);
        } else {
          query = query.where(function() {
            this.where('status', '!=', 'DISPONIVEL').orWhere('ativo', false);
          });
        }
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('id_equipamento as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = [
        'codigo_equipamento', 'nome_equipamento', 'tipo_equipamento', 
        'valor_locacao_diaria', 'status', 'condicao', 'created_at'
      ];
      
      if (validSortFields.includes(sort)) {
        query = query.orderBy(sort, order);
      } else {
        query = query.orderBy('codigo_equipamento', 'asc');
      }

      const equipment = await query.limit(limit).offset(offset);

      return {
        data: equipment,
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
      console.error('Error fetching equipment:', error);
      throw new Error('Erro ao buscar equipamentos: ' + error.message);
    }
  }

  /**
   * Get equipment by ID
   */
  async getEquipmentById(id) {
    try {
      const equipment = await db(this.tableName)
        .select('*')
        .where('id_equipamento', id)
        .first();

      if (!equipment) {
        throw new Error('Equipamento não encontrado');
      }

      // Get current rental info if equipment is rented
      if (equipment.status === 'LOCADO') {
        const currentRental = await db('loc_01_contratos_locacao')
          .select([
            'numero_contrato',
            'data_inicio',
            'data_fim',
            'valor_diario'
          ])
          .leftJoin('cad_03_clientes as cliente', 'cliente.id_cliente', 'loc_01_contratos_locacao.cliente_id')
          .select('cliente.nome_razao_social as cliente_nome')
          .where('equipamento_id', id)
          .where('status', 'ATIVO')
          .first();
          
        equipment.locacao_atual = currentRental;
      }

      // Add audit log
      await this.addAuditLog(id, 'VIEW', 'Consulta do equipamento');

      return equipment;
    } catch (error) {
      console.error('Error fetching equipment by ID:', error);
      throw new Error('Erro ao buscar equipamento: ' + error.message);
    }
  }

  /**
   * Create new equipment
   */
  async createEquipment(equipmentData) {
    const trx = await db.transaction();
    try {
      // Check for code uniqueness
      const existingEquipment = await trx(this.tableName)
        .select('id_equipamento')
        .where('codigo_equipamento', equipmentData.codigo_equipamento)
        .first();

      if (existingEquipment) {
        throw new Error('Já existe um equipamento com este código');
      }

      // Calculate next maintenance date if interval is provided
      if (equipmentData.intervalo_manutencao_dias && !equipmentData.proxima_manutencao) {
        const nextMaintenanceDate = new Date();
        nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + equipmentData.intervalo_manutencao_dias);
        equipmentData.proxima_manutencao = nextMaintenanceDate.toISOString().split('T')[0];
      }

      // Insert equipment
      const [newEquipment] = await trx(this.tableName)
        .insert({
          ...equipmentData,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('*');

      // Add audit log
      await this.addAuditLog(newEquipment.id_equipamento, 'CREATE', 'Equipamento criado', trx);

      await trx.commit();
      return newEquipment;
    } catch (error) {
      await trx.rollback();
      console.error('Error creating equipment:', error);
      throw new Error('Erro ao criar equipamento: ' + error.message);
    }
  }

  /**
   * Update equipment
   */
  async updateEquipment(id, updateData) {
    const trx = await db.transaction();
    try {
      const existingEquipment = await trx(this.tableName)
        .select('*')
        .where('id_equipamento', id)
        .first();

      if (!existingEquipment) {
        throw new Error('Equipamento não encontrado');
      }

      // Check if code is being changed and if it's unique
      if (updateData.codigo_equipamento && updateData.codigo_equipamento !== existingEquipment.codigo_equipamento) {
        const existingCode = await trx(this.tableName)
          .select('id_equipamento')
          .where('codigo_equipamento', updateData.codigo_equipamento)
          .whereNot('id_equipamento', id)
          .first();

        if (existingCode) {
          throw new Error('Já existe um equipamento com este código');
        }
      }

      // Update equipment
      const [updatedEquipment] = await trx(this.tableName)
        .where('id_equipamento', id)
        .update({
          ...updateData,
          updated_at: db.fn.now()
        })
        .returning('*');

      // Add audit log
      await this.addAuditLog(id, 'UPDATE', 'Equipamento atualizado', trx);

      await trx.commit();
      return updatedEquipment;
    } catch (error) {
      await trx.rollback();
      console.error('Error updating equipment:', error);
      throw new Error('Erro ao atualizar equipamento: ' + error.message);
    }
  }

  /**
   * Delete equipment
   */
  async deleteEquipment(id) {
    const trx = await db.transaction();
    try {
      const equipment = await trx(this.tableName)
        .select('*')
        .where('id_equipamento', id)
        .first();

      if (!equipment) {
        throw new Error('Equipamento não encontrado');
      }

      // Check if equipment has active rentals
      const activeRentals = await trx('loc_01_contratos_locacao')
        .select('id_contrato')
        .where('equipamento_id', id)
        .where('status', 'ATIVO')
        .first();

      if (activeRentals) {
        throw new Error('Não é possível excluir equipamento com locações ativas');
      }

      // Delete equipment
      await trx(this.tableName)
        .where('id_equipamento', id)
        .del();

      // Add audit log
      await this.addAuditLog(id, 'DELETE', 'Equipamento excluído', trx);

      await trx.commit();
      return { message: 'Equipamento excluído com sucesso' };
    } catch (error) {
      await trx.rollback();
      console.error('Error deleting equipment:', error);
      throw new Error('Erro ao excluir equipamento: ' + error.message);
    }
  }

  /**
   * Get equipment statistics
   */
  async getEquipmentStats() {
    try {
      const stats = await db(this.tableName)
        .select(
          db.raw('COUNT(*) as total_equipamentos'),
          db.raw('COUNT(*) FILTER (WHERE status = \'DISPONIVEL\' AND ativo = true) as disponiveis'),
          db.raw('COUNT(*) FILTER (WHERE status = \'LOCADO\') as locados'),
          db.raw('COUNT(*) FILTER (WHERE status = \'MANUTENCAO\') as em_manutencao'),
          db.raw('COUNT(*) FILTER (WHERE status = \'INDISPONIVEL\') as indisponiveis'),
          db.raw('AVG(valor_locacao_diaria) as valor_medio_diario')
        )
        .first();

      const typeStats = await db(this.tableName)
        .select(
          'tipo_equipamento',
          db.raw('COUNT(*) as quantidade'),
          db.raw('COUNT(*) FILTER (WHERE status = \'DISPONIVEL\') as disponiveis'),
          db.raw('AVG(valor_locacao_diaria) as valor_medio')
        )
        .groupBy('tipo_equipamento')
        .orderBy('quantidade', 'desc');

      const conditionStats = await db(this.tableName)
        .select(
          'condicao',
          db.raw('COUNT(*) as quantidade')
        )
        .groupBy('condicao')
        .orderBy('quantidade', 'desc');

      const maintenanceNeeded = await db(this.tableName)
        .select('id_equipamento')
        .where('proxima_manutencao', '<=', db.raw('CURRENT_DATE + INTERVAL \'7 days\''))
        .where('ativo', true)
        .count('id_equipamento as count')
        .first();

      return {
        geral: stats,
        por_tipo: typeStats,
        por_condicao: conditionStats,
        manutencao_proxima: parseInt(maintenanceNeeded.count)
      };
    } catch (error) {
      console.error('Error fetching equipment stats:', error);
      throw new Error('Erro ao buscar estatísticas: ' + error.message);
    }
  }

  /**
   * Get available equipment for rental
   */
  async getAvailableEquipment({ data_inicio, data_fim, tipo_equipamento } = {}) {
    try {
      let query = db(this.tableName)
        .select([
          'id_equipamento',
          'codigo_equipamento',
          'nome_equipamento',
          'tipo_equipamento',
          'marca',
          'modelo',
          'valor_locacao_diaria',
          'valor_locacao_mensal',
          'condicao',
          'localizacao_atual'
        ])
        .where('status', 'DISPONIVEL')
        .where('ativo', true);

      if (tipo_equipamento) {
        query = query.where('tipo_equipamento', tipo_equipamento);
      }

      // If dates are provided, check for conflicts
      if (data_inicio && data_fim) {
        const conflictingRentals = await db('loc_01_contratos_locacao')
          .select('equipamento_id')
          .where('status', 'ATIVO')
          .where(function() {
            this.where(function() {
              this.where('data_inicio', '<=', data_inicio)
                  .where('data_fim', '>=', data_inicio);
            })
            .orWhere(function() {
              this.where('data_inicio', '<=', data_fim)
                  .where('data_fim', '>=', data_fim);
            })
            .orWhere(function() {
              this.where('data_inicio', '>=', data_inicio)
                  .where('data_fim', '<=', data_fim);
            });
          });

        const conflictingIds = conflictingRentals.map(r => r.equipamento_id);
        
        if (conflictingIds.length > 0) {
          query = query.whereNotIn('id_equipamento', conflictingIds);
        }
      }

      const equipment = await query.orderBy('nome_equipamento', 'asc');
      return equipment;
    } catch (error) {
      console.error('Error fetching available equipment:', error);
      throw new Error('Erro ao buscar equipamentos disponíveis: ' + error.message);
    }
  }

  /**
   * Update equipment status
   */
  async updateEquipmentStatus(id, { status, observacoes }) {
    const trx = await db.transaction();
    try {
      const equipment = await trx(this.tableName)
        .select('*')
        .where('id_equipamento', id)
        .first();

      if (!equipment) {
        throw new Error('Equipamento não encontrado');
      }

      // Update status
      const [updatedEquipment] = await trx(this.tableName)
        .where('id_equipamento', id)
        .update({
          status,
          observacoes: observacoes || equipment.observacoes,
          updated_at: db.fn.now()
        })
        .returning('*');

      // Add audit log
      await this.addAuditLog(id, 'STATUS_UPDATE', `Status alterado para ${status}`, trx);

      await trx.commit();
      return {
        message: 'Status do equipamento atualizado com sucesso',
        equipment: updatedEquipment
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error updating equipment status:', error);
      throw new Error('Erro ao atualizar status do equipamento: ' + error.message);
    }
  }

  /**
   * Get equipment maintenance history
   */
  async getEquipmentMaintenance(id) {
    try {
      const equipment = await db(this.tableName)
        .select('nome_equipamento', 'codigo_equipamento')
        .where('id_equipamento', id)
        .first();

      if (!equipment) {
        throw new Error('Equipamento não encontrado');
      }

      const maintenance = await db('loc_03_manutencoes')
        .select('*')
        .where('equipamento_id', id)
        .orderBy('data_agendada', 'desc');

      return {
        equipamento: equipment,
        historico_manutencao: maintenance
      };
    } catch (error) {
      console.error('Error fetching equipment maintenance:', error);
      throw new Error('Erro ao buscar histórico de manutenção: ' + error.message);
    }
  }

  /**
   * Add audit log
   */
  async addAuditLog(equipmentId, action, description, trx = db) {
    try {
      await trx('loc_audit_logs').insert({
        tabela: this.tableName,
        registro_id: equipmentId,
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

module.exports = new EquipmentService();
