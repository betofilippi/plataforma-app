/**
 * Migração: Criação do Módulo de Estoque (EST)
 * Data: 2025-07-06
 * Descrição: Cria as tabelas do módulo EST (Estoque) do ERP NXT
 * Agente: 3 - EST (Controle de Estoque)
 */

exports.up = async function(knex) {
  console.log('🚀 Iniciando migração: Módulo de Estoque (EST)')
  
  try {
    // Criar schema estoque se não existir
    await knex.raw('CREATE SCHEMA IF NOT EXISTS estoque')
    
    // 1. Tabela de Configuração de Alertas
    await knex.schema.withSchema('estoque').createTable('configuracao_alertas', table => {
      table.increments('id').primary()
      table.integer('produto_id').notNullable()
      table.integer('deposito_id').notNullable()
      table.decimal('estoque_minimo', 12, 3).notNullable()
      table.decimal('estoque_maximo', 12, 3).nullable()
      table.decimal('ponto_reposicao', 12, 3).nullable()
      table.enum('criticidade', ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).defaultTo('MEDIA')
      table.boolean('ativo').defaultTo(true)
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.index(['produto_id', 'deposito_id'])
      table.index(['ativo'])
      table.index(['criticidade'])
    })
    
    // 2. Tabela de Alertas de Estoque
    await knex.schema.withSchema('estoque').createTable('alertas_estoque', table => {
      table.increments('id').primary()
      table.integer('produto_id').notNullable()
      table.integer('deposito_id').notNullable()
      table.enum('tipo_alerta', [
        'ESTOQUE_MINIMO',
        'ESTOQUE_ZERADO',
        'ESTOQUE_NEGATIVO',
        'VALIDADE_PROXIMA',
        'LOTE_VENCIDO',
        'DIVERGENCIA_INVENTARIO'
      ]).notNullable()
      table.enum('criticidade', ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).notNullable()
      table.text('mensagem').notNullable()
      table.json('detalhes').nullable()
      table.decimal('estoque_atual', 12, 3).nullable()
      table.decimal('estoque_minimo', 12, 3).nullable()
      table.enum('status', ['PENDENTE', 'VISUALIZADO', 'RESOLVIDO', 'IGNORADO']).defaultTo('PENDENTE')
      table.timestamp('data_alerta').defaultTo(knex.fn.now())
      table.timestamp('data_resolucao').nullable()
      table.integer('resolvido_por').nullable()
      table.text('observacoes_resolucao').nullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.index(['produto_id', 'deposito_id'])
      table.index(['tipo_alerta'])
      table.index(['criticidade'])
      table.index(['status'])
      table.index(['data_alerta'])
    })
    
    // 3. Tabela de Lotes
    await knex.schema.withSchema('estoque').createTable('lotes', table => {
      table.increments('id').primary()
      table.string('numero_lote', 50).notNullable()
      table.integer('produto_id').notNullable()
      table.integer('fornecedor_id').nullable()
      table.date('data_fabricacao').nullable()
      table.date('data_validade').nullable()
      table.decimal('quantidade_inicial', 12, 3).notNullable()
      table.decimal('quantidade_atual', 12, 3).notNullable()
      table.decimal('custo_unitario', 12, 4).notNullable()
      table.decimal('custo_total', 12, 2).notNullable()
      table.string('localizacao', 100).nullable()
      table.text('observacoes').nullable()
      table.enum('status', ['ATIVO', 'BLOQUEADO', 'VENCIDO', 'CONSUMIDO']).defaultTo('ATIVO')
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.unique(['numero_lote', 'produto_id'])
      table.index(['produto_id'])
      table.index(['fornecedor_id'])
      table.index(['data_validade'])
      table.index(['status'])
    })
    
    // 4. Tabela de Movimentações de Estoque
    await knex.schema.withSchema('estoque').createTable('movimentacoes', table => {
      table.increments('id').primary()
      table.string('numero_documento', 50).nullable()
      table.enum('tipo_movimentacao', [
        'ENTRADA',
        'SAIDA',
        'TRANSFERENCIA',
        'AJUSTE',
        'INVENTARIO',
        'DEVOLUCAO',
        'PERDA',
        'QUEBRA'
      ]).notNullable()
      table.enum('origem_movimentacao', [
        'COMPRA',
        'VENDA',
        'TRANSFERENCIA',
        'AJUSTE_MANUAL',
        'INVENTARIO',
        'DEVOLUCAO_CLIENTE',
        'DEVOLUCAO_FORNECEDOR',
        'PRODUCAO',
        'CONSUMO_PRODUCAO',
        'CORRECAO'
      ]).notNullable()
      table.integer('produto_id').notNullable()
      table.integer('lote_id').nullable()
      table.integer('deposito_origem_id').nullable()
      table.integer('deposito_destino_id').nullable()
      table.decimal('quantidade', 12, 3).notNullable()
      table.decimal('custo_unitario', 12, 4).notNullable()
      table.decimal('custo_total', 12, 2).notNullable()
      table.decimal('preco_venda', 12, 4).nullable()
      table.enum('indicador_cd', ['C', 'D']).notNullable() // C = Crédito (entrada), D = Débito (saída)
      table.integer('documento_referencia_id').nullable()
      table.string('documento_referencia_tipo', 20).nullable()
      table.text('observacoes').nullable()
      table.json('dados_adicionais').nullable()
      table.integer('usuario_id').notNullable()
      table.timestamp('data_movimentacao').defaultTo(knex.fn.now())
      table.timestamp('created_at').defaultTo(knex.fn.now())
      
      table.index(['produto_id'])
      table.index(['lote_id'])
      table.index(['deposito_origem_id'])
      table.index(['deposito_destino_id'])
      table.index(['tipo_movimentacao'])
      table.index(['origem_movimentacao'])
      table.index(['data_movimentacao'])
      table.index(['usuario_id'])
      table.index(['documento_referencia_id', 'documento_referencia_tipo'])
    })
    
    // 5. Tabela de Saldos de Estoque (consolidado)
    await knex.schema.withSchema('estoque').createTable('saldos', table => {
      table.increments('id').primary()
      table.integer('produto_id').notNullable()
      table.integer('deposito_id').notNullable()
      table.integer('lote_id').nullable()
      table.decimal('quantidade_atual', 12, 3).notNullable()
      table.decimal('quantidade_reservada', 12, 3).defaultTo(0)
      table.decimal('quantidade_disponivel', 12, 3).notNullable()
      table.decimal('custo_medio_ponderado', 12, 4).notNullable()
      table.decimal('valor_total_estoque', 12, 2).notNullable()
      table.timestamp('ultima_movimentacao').nullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.unique(['produto_id', 'deposito_id', 'lote_id'])
      table.index(['produto_id'])
      table.index(['deposito_id'])
      table.index(['lote_id'])
      table.index(['quantidade_atual'])
    })
    
    // 6. Tabela de Reservas de Estoque
    await knex.schema.withSchema('estoque').createTable('reservas', table => {
      table.increments('id').primary()
      table.integer('produto_id').notNullable()
      table.integer('deposito_id').notNullable()
      table.integer('lote_id').nullable()
      table.decimal('quantidade', 12, 3).notNullable()
      table.enum('tipo_reserva', [
        'VENDA',
        'TRANSFERENCIA',
        'PRODUCAO',
        'PROMOCAO',
        'MANUTENCAO'
      ]).notNullable()
      table.integer('documento_referencia_id').notNullable()
      table.string('documento_referencia_tipo', 20).notNullable()
      table.text('motivo').nullable()
      table.date('data_validade_reserva').nullable()
      table.enum('status', ['ATIVA', 'CONSUMIDA', 'CANCELADA', 'EXPIRADA']).defaultTo('ATIVA')
      table.integer('usuario_id').notNullable()
      table.timestamp('data_reserva').defaultTo(knex.fn.now())
      table.timestamp('data_consumo').nullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.index(['produto_id', 'deposito_id'])
      table.index(['lote_id'])
      table.index(['tipo_reserva'])
      table.index(['documento_referencia_id', 'documento_referencia_tipo'])
      table.index(['status'])
      table.index(['data_validade_reserva'])
    })
    
    // 7. Tabela de Inventários
    await knex.schema.withSchema('estoque').createTable('inventarios', table => {
      table.increments('id').primary()
      table.string('numero_inventario', 20).unique().notNullable()
      table.text('descricao').nullable()
      table.integer('deposito_id').notNullable()
      table.date('data_inicio').notNullable()
      table.date('data_fim').nullable()
      table.enum('tipo', ['GERAL', 'CICLICO', 'SPOT', 'ABC']).notNullable()
      table.enum('status', ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).defaultTo('PLANEJADO')
      table.json('filtros').nullable() // Filtros para produtos incluídos
      table.integer('responsavel_id').notNullable()
      table.text('observacoes').nullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.index(['deposito_id'])
      table.index(['data_inicio'])
      table.index(['tipo'])
      table.index(['status'])
      table.index(['responsavel_id'])
    })
    
    // 8. Tabela de Itens de Inventário
    await knex.schema.withSchema('estoque').createTable('inventario_itens', table => {
      table.increments('id').primary()
      table.integer('inventario_id').notNullable()
      table.integer('produto_id').notNullable()
      table.integer('lote_id').nullable()
      table.decimal('quantidade_sistema', 12, 3).notNullable()
      table.decimal('quantidade_contada', 12, 3).nullable()
      table.decimal('diferenca', 12, 3).nullable()
      table.decimal('custo_unitario', 12, 4).notNullable()
      table.decimal('valor_diferenca', 12, 2).nullable()
      table.enum('status_item', ['PENDENTE', 'CONTADO', 'AJUSTADO', 'IGNORADO']).defaultTo('PENDENTE')
      table.text('observacoes').nullable()
      table.integer('contador_id').nullable()
      table.timestamp('data_contagem').nullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.unique(['inventario_id', 'produto_id', 'lote_id'])
      table.index(['inventario_id'])
      table.index(['produto_id'])
      table.index(['lote_id'])
      table.index(['status_item'])
      table.index(['contador_id'])
      
      // Foreign key
      table.foreign('inventario_id').references('id').inTable('estoque.inventarios').onDelete('CASCADE')
    })
    
    // 9. Tabela de Configuração de Políticas
    await knex.schema.withSchema('estoque').createTable('politicas_estoque', table => {
      table.increments('id').primary()
      table.string('nome', 100).notNullable()
      table.text('descricao').nullable()
      table.enum('politica_consumo', ['FIFO', 'LIFO', 'FEFO']).defaultTo('FIFO')
      table.enum('politica_custeio', ['PEPS', 'UEPS', 'MEDIA_PONDERADA']).defaultTo('MEDIA_PONDERADA')
      table.boolean('permite_estoque_negativo').defaultTo(false)
      table.boolean('obriga_lote').defaultTo(false)
      table.boolean('controla_validade').defaultTo(false)
      table.integer('dias_alerta_vencimento').defaultTo(30)
      table.boolean('calcula_abc').defaultTo(true)
      table.json('configuracoes_adicionais').nullable()
      table.boolean('ativo').defaultTo(true)
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      
      table.index(['ativo'])
    })
    
    console.log('✅ Módulo de Estoque (EST) criado com sucesso!')
    console.log('📊 Tabelas criadas:')
    console.log('   - estoque.configuracao_alertas')
    console.log('   - estoque.alertas_estoque') 
    console.log('   - estoque.lotes')
    console.log('   - estoque.movimentacoes')
    console.log('   - estoque.saldos')
    console.log('   - estoque.reservas')
    console.log('   - estoque.inventarios')
    console.log('   - estoque.inventario_itens')
    console.log('   - estoque.politicas_estoque')
    
    // Inserir política padrão
    await knex('estoque.politicas_estoque').insert({
      nome: 'Política Padrão',
      descricao: 'Política padrão do sistema para controle de estoque',
      politica_consumo: 'FIFO',
      politica_custeio: 'MEDIA_PONDERADA',
      permite_estoque_negativo: false,
      obriga_lote: false,
      controla_validade: true,
      dias_alerta_vencimento: 30,
      calcula_abc: true,
      ativo: true
    })
    
    console.log('✅ Política padrão de estoque inserida')
    
  } catch (error) {
    console.error('❌ Erro na migração do módulo de estoque:', error)
    throw error
  }
}

exports.down = async function(knex) {
  console.log('⚠️  Revertendo migração: Módulo de Estoque (EST)')
  
  try {
    // Remover tabelas em ordem reversa (respeitando foreign keys)
    const tables = [
      'inventario_itens',
      'inventarios',
      'reservas',
      'saldos',
      'movimentacoes',
      'lotes',
      'alertas_estoque',
      'configuracao_alertas',
      'politicas_estoque'
    ]
    
    for (const table of tables) {
      await knex.raw(`DROP TABLE IF EXISTS estoque.${table} CASCADE`)
      console.log(`🗑️  Tabela estoque.${table} removida`)
    }
    
    // Remover schema se estiver vazio
    await knex.raw('DROP SCHEMA IF EXISTS estoque CASCADE')
    
    console.log('✅ Migração EST revertida com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao reverter migração EST:', error)
    throw error
  }
}