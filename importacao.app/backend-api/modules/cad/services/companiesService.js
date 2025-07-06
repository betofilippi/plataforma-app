const db = require('../../../src/database/connection');

/**
 * Service for companies/branches operations
 * Handles multi-company business logic
 */

class CompaniesService {
  /**
   * Get all companies with pagination and filters
   */
  async getAllCompanies(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      ativo = null,
      sort = 'razao_social',
      order = 'asc'
    } = options;

    try {
      const offset = (page - 1) * limit;
      
      // Base query
      let query = db('cad_empresas as e')
        .select([
          'e.id_empresa',
          'e.cnpj',
          'e.razao_social',
          'e.nome_fantasia',
          'e.inscricao_estadual',
          'e.inscricao_municipal',
          'e.email',
          'e.telefone',
          'e.endereco_logradouro',
          'e.endereco_numero',
          'e.endereco_complemento',
          'e.endereco_bairro',
          'e.endereco_cidade',
          'e.endereco_uf',
          'e.endereco_cep',
          'e.regime_tributario',
          'e.principal',
          'e.ativo',
          'e.created_at',
          'e.updated_at',
          db.raw('(SELECT COUNT(*) FROM cad_estabelecimentos WHERE id_empresa = e.id_empresa) as total_estabelecimentos')
        ]);

      // Apply filters
      if (search) {
        query.where(function() {
          this.whereILike('e.razao_social', `%${search}%`)
              .orWhereILike('e.nome_fantasia', `%${search}%`)
              .orWhereILike('e.cnpj', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query.where('e.ativo', ativo);
      }

      // Count total
      const totalQuery = query.clone().count('e.id_empresa as count').first();
      const { count: total } = await totalQuery;

      // Apply sorting and pagination
      query.orderBy(`e.${sort}`, order)
           .limit(limit)
           .offset(offset);

      const companies = await query;

      return {
        data: companies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in CompaniesService.getAllCompanies:', error);
      throw new Error('Erro ao buscar empresas');
    }
  }

  /**
   * Get company by ID with optional establishments
   */
  async getCompanyById(id, includeEstablishments = false) {
    try {
      const company = await db('cad_empresas as e')
        .select([
          'e.*',
          db.raw('(SELECT COUNT(*) FROM cad_estabelecimentos WHERE id_empresa = e.id_empresa) as total_estabelecimentos')
        ])
        .where('e.id_empresa', id)
        .first();

      if (!company) {
        throw new Error('Empresa não encontrada');
      }

      if (includeEstablishments) {
        company.estabelecimentos = await this.getCompanyEstablishments(id);
      }

      return company;
    } catch (error) {
      console.error('Error in CompaniesService.getCompanyById:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao buscar empresa');
    }
  }

  /**
   * Create new company
   */
  async createCompany(companyData) {
    try {
      // Check for duplicate CNPJ
      const existingCnpj = await db('cad_empresas')
        .where('cnpj', companyData.cnpj)
        .first();

      if (existingCnpj) {
        throw new Error('Já existe uma empresa com este CNPJ');
      }

      // Check for duplicate razao_social
      const existingRazaoSocial = await db('cad_empresas')
        .where('razao_social', companyData.razao_social)
        .first();

      if (existingRazaoSocial) {
        throw new Error('Já existe uma empresa com esta razão social');
      }

      // If this is the first company, make it principal
      const companyCount = await db('cad_empresas').count().first();
      const isPrincipal = parseInt(companyCount.count) === 0;

      const newCompany = {
        ...companyData,
        principal: isPrincipal,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [id] = await db('cad_empresas').insert(newCompany).returning('id_empresa');
      return await this.getCompanyById(id.id_empresa || id);
    } catch (error) {
      console.error('Error in CompaniesService.createCompany:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar empresa');
    }
  }

  /**
   * Update company
   */
  async updateCompany(id, updateData) {
    try {
      const company = await this.getCompanyById(id);

      // Check for duplicate CNPJ (excluding current company)
      if (updateData.cnpj) {
        const existing = await db('cad_empresas')
          .where('cnpj', updateData.cnpj)
          .whereNot('id_empresa', id)
          .first();

        if (existing) {
          throw new Error('Já existe uma empresa com este CNPJ');
        }
      }

      // Check for duplicate razao_social (excluding current company)
      if (updateData.razao_social) {
        const existing = await db('cad_empresas')
          .where('razao_social', updateData.razao_social)
          .whereNot('id_empresa', id)
          .first();

        if (existing) {
          throw new Error('Já existe uma empresa com esta razão social');
        }
      }

      const updatedData = {
        ...updateData,
        updated_at: new Date()
      };

      await db('cad_empresas').where('id_empresa', id).update(updatedData);

      return await this.getCompanyById(id);
    } catch (error) {
      console.error('Error in CompaniesService.updateCompany:', error);
      if (error.message.includes('não encontrada') || error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao atualizar empresa');
    }
  }

  /**
   * Delete company
   */
  async deleteCompany(id) {
    try {
      const company = await this.getCompanyById(id);

      // Check if company is principal
      if (company.principal) {
        throw new Error('Não é possível remover a empresa principal');
      }

      // Check for establishments
      const establishments = await db('cad_estabelecimentos')
        .where('id_empresa', id)
        .count()
        .first();

      if (parseInt(establishments.count) > 0) {
        throw new Error('Empresa possui estabelecimentos associados e não pode ser removida');
      }

      await db('cad_empresas').where('id_empresa', id).del();

      return { message: 'Empresa removida com sucesso' };
    } catch (error) {
      console.error('Error in CompaniesService.deleteCompany:', error);
      if (error.message.includes('não encontrada') || 
          error.message.includes('principal') ||
          error.message.includes('possui estabelecimentos')) {
        throw error;
      }
      throw new Error('Erro ao remover empresa');
    }
  }

  /**
   * Set company as principal
   */
  async setMainCompany(id) {
    try {
      const company = await this.getCompanyById(id);

      // Remove principal flag from all companies
      await db('cad_empresas').update({ principal: false });

      // Set this company as principal
      await db('cad_empresas')
        .where('id_empresa', id)
        .update({ 
          principal: true,
          updated_at: new Date()
        });

      return await this.getCompanyById(id);
    } catch (error) {
      console.error('Error in CompaniesService.setMainCompany:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao definir empresa principal');
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats() {
    try {
      const [total, ativas, principal, estabelecimentos] = await Promise.all([
        db('cad_empresas').count().first(),
        db('cad_empresas').where('ativo', true).count().first(),
        db('cad_empresas').where('principal', true).first(),
        db('cad_estabelecimentos').count().first()
      ]);

      const porUf = await db('cad_empresas')
        .select('endereco_uf')
        .count()
        .groupBy('endereco_uf')
        .orderBy('count', 'desc');

      const porRegimeTributario = await db('cad_empresas')
        .select('regime_tributario')
        .count()
        .groupBy('regime_tributario')
        .orderBy('count', 'desc');

      return {
        total: parseInt(total.count),
        ativas: parseInt(ativas.count),
        inativas: parseInt(total.count) - parseInt(ativas.count),
        empresa_principal: principal ? {
          id: principal.id_empresa,
          razao_social: principal.razao_social,
          cnpj: principal.cnpj
        } : null,
        total_estabelecimentos: parseInt(estabelecimentos.count),
        por_uf: porUf.map(stat => ({
          uf: stat.endereco_uf || 'Não informado',
          quantidade: parseInt(stat.count)
        })),
        por_regime_tributario: porRegimeTributario.map(stat => ({
          regime: stat.regime_tributario || 'Não informado',
          quantidade: parseInt(stat.count)
        }))
      };
    } catch (error) {
      console.error('Error in CompaniesService.getCompanyStats:', error);
      throw new Error('Erro ao buscar estatísticas de empresas');
    }
  }

  /**
   * Get establishments for a company
   */
  async getCompanyEstablishments(companyId) {
    try {
      const company = await this.getCompanyById(companyId);

      const establishments = await db('cad_estabelecimentos as est')
        .select([
          'est.*',
          db.raw('(SELECT COUNT(*) FROM usr_usuarios WHERE id_estabelecimento = est.id_estabelecimento) as total_usuarios')
        ])
        .where('est.id_empresa', companyId)
        .orderBy('est.nome');

      return establishments;
    } catch (error) {
      console.error('Error in CompaniesService.getCompanyEstablishments:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao buscar estabelecimentos da empresa');
    }
  }

  /**
   * Create establishment for company
   */
  async createEstablishment(companyId, establishmentData) {
    try {
      const company = await this.getCompanyById(companyId);

      // Check for duplicate CNPJ (if provided)
      if (establishmentData.cnpj) {
        const existing = await db('cad_estabelecimentos')
          .where('cnpj', establishmentData.cnpj)
          .first();

        if (existing) {
          throw new Error('Já existe um estabelecimento com este CNPJ');
        }
      }

      const newEstablishment = {
        ...establishmentData,
        id_empresa: companyId,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [id] = await db('cad_estabelecimentos')
        .insert(newEstablishment)
        .returning('id_estabelecimento');

      return await db('cad_estabelecimentos')
        .where('id_estabelecimento', id.id_estabelecimento || id)
        .first();
    } catch (error) {
      console.error('Error in CompaniesService.createEstablishment:', error);
      if (error.message.includes('não encontrada') || error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar estabelecimento');
    }
  }

  /**
   * Export companies to different formats
   */
  async exportCompanies(format = 'csv') {
    try {
      const companies = await db('cad_empresas')
        .select([
          'cnpj',
          'razao_social',
          'nome_fantasia',
          'inscricao_estadual',
          'inscricao_municipal',
          'email',
          'telefone',
          'endereco_logradouro',
          'endereco_numero',
          'endereco_complemento',
          'endereco_bairro',
          'endereco_cidade',
          'endereco_uf',
          'endereco_cep',
          'regime_tributario',
          'principal',
          'ativo'
        ])
        .orderBy('razao_social');

      if (format === 'csv') {
        let csv = 'CNPJ,Razão Social,Nome Fantasia,IE,IM,Email,Telefone,Logradouro,Número,Complemento,Bairro,Cidade,UF,CEP,Regime Tributário,Principal,Ativo\n';
        
        companies.forEach(company => {
          csv += [
            company.cnpj || '',
            company.razao_social || '',
            company.nome_fantasia || '',
            company.inscricao_estadual || '',
            company.inscricao_municipal || '',
            company.email || '',
            company.telefone || '',
            company.endereco_logradouro || '',
            company.endereco_numero || '',
            company.endereco_complemento || '',
            company.endereco_bairro || '',
            company.endereco_cidade || '',
            company.endereco_uf || '',
            company.endereco_cep || '',
            company.regime_tributario || '',
            company.principal ? 'Sim' : 'Não',
            company.ativo ? 'Sim' : 'Não'
          ].map(field => `"${field}"`).join(',') + '\n';
        });

        return csv;
      } else {
        return companies;
      }
    } catch (error) {
      console.error('Error in CompaniesService.exportCompanies:', error);
      throw new Error('Erro ao exportar empresas');
    }
  }

  /**
   * Get main company
   */
  async getMainCompany() {
    try {
      const mainCompany = await db('cad_empresas')
        .where('principal', true)
        .where('ativo', true)
        .first();

      if (!mainCompany) {
        throw new Error('Nenhuma empresa principal encontrada');
      }

      return mainCompany;
    } catch (error) {
      console.error('Error in CompaniesService.getMainCompany:', error);
      throw new Error('Erro ao buscar empresa principal');
    }
  }

  /**
   * Validate CNPJ format
   */
  validateCnpj(cnpj) {
    // Remove formatting
    cnpj = cnpj.replace(/[^\d]/g, '');

    // Check length
    if (cnpj.length !== 14) {
      return false;
    }

    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cnpj)) {
      return false;
    }

    // Validate check digits
    let sum = 0;
    let weight = 5;
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let checkDigit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    if (parseInt(cnpj[12]) !== checkDigit1) {
      return false;
    }
    
    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let checkDigit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(cnpj[13]) === checkDigit2;
  }

  /**
   * Format CNPJ for display
   */
  formatCnpj(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
}

module.exports = new CompaniesService();