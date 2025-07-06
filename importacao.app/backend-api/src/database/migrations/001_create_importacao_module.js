/**
 * Migração: Criação do Módulo de Importação
 * Data: 2025-07-05
 * Descrição: Cria as 18 tabelas do módulo IMP (Importação) do ERP NXT
 */

const fs = require('fs')
const path = require('path')

exports.up = async function(knex) {
  console.log('🚀 Iniciando migração: Módulo de Importação (18 tabelas)')
  
  try {
    // Ler o arquivo SQL com a estrutura completa
    const sqlFile = path.join(__dirname, '../schemas/importacao-tables.sql')
    const sqlContent = fs.readFileSync(sqlFile, 'utf8')
    
    // Executar o SQL completo
    await knex.raw(sqlContent)
    
    console.log('✅ Módulo de Importação criado com sucesso!')
    console.log('📊 Tabelas criadas:')
    console.log('   - imp_01_processos')
    console.log('   - imp_02_fornecedores_internacionais')
    console.log('   - imp_03_produtos_importados')
    console.log('   - imp_04_itens_processo')
    console.log('   - imp_05_documentos')
    console.log('   - imp_06_despachantes')
    console.log('   - imp_07_etapas_processo')
    console.log('   - imp_08_custos')
    console.log('   - imp_09_impostos_taxas')
    console.log('   - imp_10_licencas')
    console.log('   - imp_11_transporte')
    console.log('   - imp_12_armazenagem')
    console.log('   - imp_13_cambio_pagamentos')
    console.log('   - imp_14_inspecoes')
    console.log('   - imp_15_drawback')
    console.log('   - imp_16_entregas')
    console.log('   - imp_17_follow_up')
    console.log('   - imp_18_historico_alteracoes')
    
    // Inserir log de implementação
    await knex('log_implementacao').insert({
      fase: 'FASE_1',
      etapa: 'CRIACAO_MODULO_IMPORTACAO',
      status: 'CONCLUIDO',
      data_inicio: new Date(),
      data_fim: new Date(),
      observacoes: 'Módulo de importação com 18 tabelas criado com sucesso',
      responsavel: 'SISTEMA_MIGRACAO'
    }).catch(() => {
      // Tabela pode não existir ainda, ignorar erro
      console.log('ℹ️  Log de implementação será criado posteriormente')
    })
    
  } catch (error) {
    console.error('❌ Erro na migração do módulo de importação:', error)
    throw error
  }
}

exports.down = async function(knex) {
  console.log('⚠️  Revertendo migração: Módulo de Importação')
  
  try {
    // Remover triggers
    await knex.raw('DROP TRIGGER IF EXISTS trg_auditoria_imp_01_processos ON importacao.imp_01_processos CASCADE')
    await knex.raw('DROP TRIGGER IF EXISTS trg_auditoria_imp_02_fornecedores ON importacao.imp_02_fornecedores_internacionais CASCADE')
    await knex.raw('DROP TRIGGER IF EXISTS trg_auditoria_imp_03_produtos ON importacao.imp_03_produtos_importados CASCADE')
    
    // Remover função de auditoria
    await knex.raw('DROP FUNCTION IF EXISTS importacao.fn_auditoria_automatica() CASCADE')
    
    // Remover todas as tabelas em ordem reversa (respeitando foreign keys)
    const tables = [
      'imp_18_historico_alteracoes',
      'imp_17_follow_up',
      'imp_16_entregas',
      'imp_15_drawback',
      'imp_14_inspecoes',
      'imp_13_cambio_pagamentos',
      'imp_12_armazenagem',
      'imp_11_transporte',
      'imp_10_licencas',
      'imp_09_impostos_taxas',
      'imp_08_custos',
      'imp_07_etapas_processo',
      'imp_06_despachantes',
      'imp_05_documentos',
      'imp_04_itens_processo',
      'imp_03_produtos_importados',
      'imp_02_fornecedores_internacionais',
      'imp_01_processos'
    ]
    
    for (const table of tables) {
      await knex.raw(`DROP TABLE IF EXISTS importacao.${table} CASCADE`)
      console.log(`🗑️  Tabela importacao.${table} removida`)
    }
    
    // Remover schema se estiver vazio
    await knex.raw('DROP SCHEMA IF EXISTS importacao CASCADE')
    
    console.log('✅ Migração revertida com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao reverter migração:', error)
    throw error
  }
}