/**
 * @fileoverview Service para Estoque - Lógica de negócio para controle de inventário
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const db = require('../../../src/config/database');
const { EstoqueModel } = require('../models/Estoque');
const { LoteModel } = require('../models/Lote');
const { AlertaEstoqueModel } = require('../models/AlertaEstoque');

/**
 * Service para operações de estoque
 */
class EstoqueService {
  constructor() {
    this.estoqueModel = new EstoqueModel(db);
    this.loteModel = new LoteModel(db);
    this.alertaModel = new AlertaEstoqueModel(db);
    
    // Tabelas do banco
    this.tableSaldos = 'est_03_saldos_estoque';
    this.tableMovimentacoes = 'est_04_movimentacoes';
    this.tableLotes = 'est_05_lotes';
    this.tableTransferencias = 'est_06_transferencias';
    this.tableReservas = 'est_07_reservas';
    this.tableConfiguracaoAlertas = 'est_08_configuracao_alertas';
    this.tableAlertasGerados = 'est_09_alertas_gerados';
  }

  /**
   * Obter saldo atual de um produto em um depósito
   */
  async obterSaldoProduto(idProduto, idDeposito = null) {
    try {
      let query = db.getInstance()(this.tableSaldos)
        .select([
          'id_saldo_estoque',
          'id_produto',
          'id_deposito',
          'quantidade_disponivel',
          'quantidade_reservada',
          'quantidade_total',
          'custo_medio',
          'ultima_movimentacao',
          'updated_at'
        ])
        .where('id_produto', idProduto);

      if (idDeposito) {
        query = query.where('id_deposito', idDeposito);
      }

      const saldos = await query;

      if (idDeposito) {
        return saldos[0] || null;
      }

      // Consolidar saldos de todos os depósitos
      const saldoConsolidado = {
        id_produto: idProduto,
        quantidade_disponivel: 0,
        quantidade_reservada: 0,
        quantidade_total: 0,
        custo_medio: 0,
        depositos: saldos
      };

      let totalCusto = 0;
      let quantidadeTotalParaCusto = 0;

      saldos.forEach(saldo => {
        saldoConsolidado.quantidade_disponivel += saldo.quantidade_disponivel;
        saldoConsolidado.quantidade_reservada += saldo.quantidade_reservada;
        saldoConsolidado.quantidade_total += saldo.quantidade_total;
        
        if (saldo.quantidade_total > 0 && saldo.custo_medio > 0) {
          totalCusto += saldo.custo_medio * saldo.quantidade_total;
          quantidadeTotalParaCusto += saldo.quantidade_total;
        }
      });

      if (quantidadeTotalParaCusto > 0) {
        saldoConsolidado.custo_medio = totalCusto / quantidadeTotalParaCusto;
      }

      return saldoConsolidado;
    } catch (error) {
      console.error('Erro ao obter saldo do produto:', error);
      throw new Error('Erro ao consultar saldo do produto: ' + error.message);
    }
  }

  /**
   * Processar entrada de estoque
   */
  async processarEntrada(dadosEntrada) {
    const trx = await db.getInstance().transaction();
    
    try {
      // Validar dados
      const entradaValidada = this.estoqueModel.validarMovimentacao({
        ...dadosEntrada,
        tipo_movimentacao: 'ENTRADA',
        indicador_cd: 'C'
      });

      // Obter ou criar saldo do produto no depósito
      let saldo = await this.obterSaldoProduto(
        entradaValidada.id_produto,
        entradaValidada.id_deposito
      );

      if (!saldo) {
        // Criar novo saldo
        const novoSaldo = {
          id_produto: entradaValidada.id_produto,
          id_deposito: entradaValidada.id_deposito,
          quantidade_disponivel: 0,
          quantidade_reservada: 0,
          quantidade_total: 0,
          custo_medio: 0
        };

        const [saldoCriado] = await trx(this.tableSaldos)
          .insert(novoSaldo)
          .returning('*');
        
        saldo = saldoCriado;
      }

      // Calcular novo custo médio
      const quantidadeAnterior = saldo.quantidade_total || 0;
      const custoAnterior = saldo.custo_medio || 0;
      const quantidadeEntrada = entradaValidada.quantidade;
      const custoEntrada = entradaValidada.custo_unitario || 0;

      const novaQuantidade = quantidadeAnterior + quantidadeEntrada;
      let novoCustoMedio = custoAnterior;

      if (novaQuantidade > 0) {
        const valorAnterior = quantidadeAnterior * custoAnterior;
        const valorEntrada = quantidadeEntrada * custoEntrada;
        novoCustoMedio = (valorAnterior + valorEntrada) / novaQuantidade;
      }

      // Atualizar saldo
      await trx(this.tableSaldos)
        .where('id_saldo_estoque', saldo.id_saldo_estoque)
        .update({
          quantidade_disponivel: saldo.quantidade_disponivel + quantidadeEntrada,
          quantidade_total: novaQuantidade,
          custo_medio: novoCustoMedio,
          ultima_movimentacao: new Date(),
          updated_at: new Date()
        });

      // Registrar movimentação
      const movimentacao = {
        id_produto: entradaValidada.id_produto,
        id_deposito: entradaValidada.id_deposito,
        tipo_movimentacao: 'ENTRADA',
        indicador_cd: 'C',
        quantidade: quantidadeEntrada,
        custo_unitario: custoEntrada,
        valor_total: quantidadeEntrada * custoEntrada,
        documento_origem: entradaValidada.documento_origem,
        observacoes: entradaValidada.observacoes,
        id_usuario: entradaValidada.id_usuario,
        data_movimentacao: new Date()
      };

      const [movimentacaoCriada] = await trx(this.tableMovimentacoes)
        .insert(movimentacao)
        .returning('*');

      // Processar lote se informado
      if (entradaValidada.lote) {
        await this.processarLoteEntrada(trx, {
          id_produto: entradaValidada.id_produto,
          id_deposito: entradaValidada.id_deposito,
          id_movimentacao: movimentacaoCriada.id_movimentacao,
          quantidade: quantidadeEntrada,
          ...entradaValidada.lote
        });
      }

      await trx.commit();

      // Verificar alertas após a transação
      await this.verificarAlertas(entradaValidada.id_produto, entradaValidada.id_deposito);

      return {
        movimentacao: movimentacaoCriada,
        saldo_atualizado: await this.obterSaldoProduto(
          entradaValidada.id_produto,
          entradaValidada.id_deposito
        )
      };

    } catch (error) {
      await trx.rollback();
      console.error('Erro ao processar entrada:', error);
      throw new Error('Erro ao processar entrada de estoque: ' + error.message);
    }
  }

  /**
   * Processar saída de estoque
   */
  async processarSaida(dadosSaida) {
    const trx = await db.getInstance().transaction();
    
    try {
      // Validar dados
      const saidaValidada = this.estoqueModel.validarMovimentacao({
        ...dadosSaida,
        tipo_movimentacao: 'SAIDA',
        indicador_cd: 'D'
      });

      // Verificar saldo disponível
      const saldo = await this.obterSaldoProduto(
        saidaValidada.id_produto,
        saidaValidada.id_deposito
      );

      if (!saldo) {
        throw new Error('Produto não possui estoque neste depósito');
      }

      if (saldo.quantidade_disponivel < saidaValidada.quantidade) {
        throw new Error(
          `Quantidade insuficiente. Disponível: ${saldo.quantidade_disponivel}, ` +
          `Solicitado: ${saidaValidada.quantidade}`
        );
      }

      // Processar saída por lotes (FIFO/FEFO)
      let quantidadeRestante = saidaValidada.quantidade;
      const lotesConsumidos = [];

      if (saidaValidada.usa_controle_lote) {
        const lotes = await this.obterLotesDisponiveis(
          saidaValidada.id_produto,
          saidaValidada.id_deposito,
          saidaValidada.politica_consumo || 'FIFO'
        );

        for (const lote of lotes) {
          if (quantidadeRestante <= 0) break;

          const quantidadeConsumir = Math.min(
            quantidadeRestante,
            lote.quantidade_disponivel
          );

          await trx(this.tableLotes)
            .where('id_lote', lote.id_lote)
            .update({
              quantidade_disponivel: lote.quantidade_disponivel - quantidadeConsumir,
              updated_at: new Date()
            });

          lotesConsumidos.push({
            id_lote: lote.id_lote,
            numero_lote: lote.numero_lote,
            quantidade_consumida: quantidadeConsumir
          });

          quantidadeRestante -= quantidadeConsumir;
        }

        if (quantidadeRestante > 0) {
          throw new Error('Quantidade insuficiente em lotes disponíveis');
        }
      }

      // Atualizar saldo
      await trx(this.tableSaldos)
        .where('id_saldo_estoque', saldo.id_saldo_estoque)
        .update({
          quantidade_disponivel: saldo.quantidade_disponivel - saidaValidada.quantidade,
          quantidade_total: saldo.quantidade_total - saidaValidada.quantidade,
          ultima_movimentacao: new Date(),
          updated_at: new Date()
        });

      // Registrar movimentação
      const movimentacao = {
        id_produto: saidaValidada.id_produto,
        id_deposito: saidaValidada.id_deposito,
        tipo_movimentacao: 'SAIDA',
        indicador_cd: 'D',
        quantidade: saidaValidada.quantidade,
        custo_unitario: saldo.custo_medio,
        valor_total: saidaValidada.quantidade * saldo.custo_medio,
        documento_origem: saidaValidada.documento_origem,
        observacoes: saidaValidada.observacoes,
        id_usuario: saidaValidada.id_usuario,
        data_movimentacao: new Date(),
        lotes_consumidos: lotesConsumidos.length > 0 ? JSON.stringify(lotesConsumidos) : null
      };

      const [movimentacaoCriada] = await trx(this.tableMovimentacoes)
        .insert(movimentacao)
        .returning('*');

      await trx.commit();

      // Verificar alertas após a transação
      await this.verificarAlertas(saidaValidada.id_produto, saidaValidada.id_deposito);

      return {
        movimentacao: movimentacaoCriada,
        lotes_consumidos: lotesConsumidos,
        saldo_atualizado: await this.obterSaldoProduto(
          saidaValidada.id_produto,
          saidaValidada.id_deposito
        )
      };

    } catch (error) {
      await trx.rollback();
      console.error('Erro ao processar saída:', error);
      throw new Error('Erro ao processar saída de estoque: ' + error.message);
    }
  }

  /**
   * Processar transferência entre depósitos
   */
  async processarTransferencia(dadosTransferencia) {
    const trx = await db.getInstance().transaction();
    
    try {
      // Validar dados
      const transferenciaValidada = this.estoqueModel.validarTransferencia(dadosTransferencia);

      // Verificar se os depósitos são diferentes
      if (transferenciaValidada.id_deposito_origem === transferenciaValidada.id_deposito_destino) {
        throw new Error('Depósito de origem e destino devem ser diferentes');
      }

      // Processar saída do depósito origem
      await this.processarSaida({
        id_produto: transferenciaValidada.id_produto,
        id_deposito: transferenciaValidada.id_deposito_origem,
        quantidade: transferenciaValidada.quantidade,
        documento_origem: `TRANSF-${Date.now()}`,
        observacoes: `Transferência para depósito ${transferenciaValidada.id_deposito_destino}`,
        id_usuario: transferenciaValidada.id_usuario
      });

      // Processar entrada no depósito destino
      const saldoOrigem = await this.obterSaldoProduto(
        transferenciaValidada.id_produto,
        transferenciaValidada.id_deposito_origem
      );

      await this.processarEntrada({
        id_produto: transferenciaValidada.id_produto,
        id_deposito: transferenciaValidada.id_deposito_destino,
        quantidade: transferenciaValidada.quantidade,
        custo_unitario: saldoOrigem?.custo_medio || 0,
        documento_origem: `TRANSF-${Date.now()}`,
        observacoes: `Transferência do depósito ${transferenciaValidada.id_deposito_origem}`,
        id_usuario: transferenciaValidada.id_usuario
      });

      // Registrar transferência
      const transferencia = {
        id_produto: transferenciaValidada.id_produto,
        id_deposito_origem: transferenciaValidada.id_deposito_origem,
        id_deposito_destino: transferenciaValidada.id_deposito_destino,
        quantidade: transferenciaValidada.quantidade,
        custo_unitario: saldoOrigem?.custo_medio || 0,
        observacoes: transferenciaValidada.observacoes,
        id_usuario: transferenciaValidada.id_usuario,
        status: 'CONCLUIDA',
        data_transferencia: new Date()
      };

      const [transferenciaCriada] = await trx(this.tableTransferencias)
        .insert(transferencia)
        .returning('*');

      await trx.commit();

      return {
        transferencia: transferenciaCriada,
        saldo_origem: await this.obterSaldoProduto(
          transferenciaValidada.id_produto,
          transferenciaValidada.id_deposito_origem
        ),
        saldo_destino: await this.obterSaldoProduto(
          transferenciaValidada.id_produto,
          transferenciaValidada.id_deposito_destino
        )
      };

    } catch (error) {
      await trx.rollback();
      console.error('Erro ao processar transferência:', error);
      throw new Error('Erro ao processar transferência: ' + error.message);
    }
  }

  /**
   * Criar ou atualizar reserva de estoque
   */
  async criarReserva(dadosReserva) {
    try {
      // Validar dados
      const reservaValidada = this.estoqueModel.validarReserva(dadosReserva);

      // Verificar saldo disponível
      const saldo = await this.obterSaldoProduto(
        reservaValidada.id_produto,
        reservaValidada.id_deposito
      );

      if (!saldo) {
        throw new Error('Produto não possui estoque neste depósito');
      }

      const quantidadeDisponivel = saldo.quantidade_disponivel;
      if (quantidadeDisponivel < reservaValidada.quantidade) {
        throw new Error(
          `Quantidade insuficiente para reserva. Disponível: ${quantidadeDisponivel}, ` +
          `Solicitado: ${reservaValidada.quantidade}`
        );
      }

      const trx = await db.getInstance().transaction();

      try {
        // Criar reserva
        const reserva = {
          ...reservaValidada,
          status: 'ATIVA',
          data_criacao: new Date()
        };

        const [reservaCriada] = await trx(this.tableReservas)
          .insert(reserva)
          .returning('*');

        // Atualizar saldo (transferir de disponível para reservado)
        await trx(this.tableSaldos)
          .where('id_saldo_estoque', saldo.id_saldo_estoque)
          .update({
            quantidade_disponivel: saldo.quantidade_disponivel - reservaValidada.quantidade,
            quantidade_reservada: saldo.quantidade_reservada + reservaValidada.quantidade,
            updated_at: new Date()
          });

        await trx.commit();

        return {
          reserva: reservaCriada,
          saldo_atualizado: await this.obterSaldoProduto(
            reservaValidada.id_produto,
            reservaValidada.id_deposito
          )
        };

      } catch (error) {
        await trx.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      throw new Error('Erro ao criar reserva: ' + error.message);
    }
  }

  /**
   * Liberar reserva de estoque
   */
  async liberarReserva(idReserva, motivo = null) {
    try {
      // Buscar reserva
      const reserva = await db.getInstance()(this.tableReservas)
        .where('id_reserva', idReserva)
        .where('status', 'ATIVA')
        .first();

      if (!reserva) {
        throw new Error('Reserva não encontrada ou já liberada');
      }

      const trx = await db.getInstance().transaction();

      try {
        // Atualizar status da reserva
        await trx(this.tableReservas)
          .where('id_reserva', idReserva)
          .update({
            status: 'LIBERADA',
            data_liberacao: new Date(),
            motivo_liberacao: motivo,
            updated_at: new Date()
          });

        // Obter saldo atual
        const saldo = await this.obterSaldoProduto(
          reserva.id_produto,
          reserva.id_deposito
        );

        // Atualizar saldo (transferir de reservado para disponível)
        await trx(this.tableSaldos)
          .where('id_produto', reserva.id_produto)
          .where('id_deposito', reserva.id_deposito)
          .update({
            quantidade_disponivel: saldo.quantidade_disponivel + reserva.quantidade,
            quantidade_reservada: saldo.quantidade_reservada - reserva.quantidade,
            updated_at: new Date()
          });

        await trx.commit();

        return {
          message: 'Reserva liberada com sucesso',
          saldo_atualizado: await this.obterSaldoProduto(
            reserva.id_produto,
            reserva.id_deposito
          )
        };

      } catch (error) {
        await trx.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      throw new Error('Erro ao liberar reserva: ' + error.message);
    }
  }

  /**
   * Processar lote na entrada
   */
  async processarLoteEntrada(trx, dadosLote) {
    try {
      // Validar dados do lote
      const loteValidado = this.loteModel.validarLote(dadosLote);

      // Verificar se lote já existe
      const loteExistente = await trx(this.tableLotes)
        .where('numero_lote', loteValidado.numero_lote)
        .where('id_produto', loteValidado.id_produto)
        .first();

      if (loteExistente) {
        // Atualizar lote existente
        await trx(this.tableLotes)
          .where('id_lote', loteExistente.id_lote)
          .update({
            quantidade_total: loteExistente.quantidade_total + loteValidado.quantidade,
            quantidade_disponivel: loteExistente.quantidade_disponivel + loteValidado.quantidade,
            updated_at: new Date()
          });

        return loteExistente.id_lote;
      } else {
        // Criar novo lote
        const novoLote = {
          ...loteValidado,
          quantidade_total: loteValidado.quantidade,
          quantidade_disponivel: loteValidado.quantidade,
          status: 'ATIVO'
        };

        const [loteCriado] = await trx(this.tableLotes)
          .insert(novoLote)
          .returning('*');

        return loteCriado.id_lote;
      }

    } catch (error) {
      console.error('Erro ao processar lote:', error);
      throw error;
    }
  }

  /**
   * Obter lotes disponíveis por política de consumo
   */
  async obterLotesDisponiveis(idProduto, idDeposito, politica = 'FIFO') {
    try {
      let query = db.getInstance()(this.tableLotes)
        .select('*')
        .where('id_produto', idProduto)
        .where('id_deposito', idDeposito)
        .where('quantidade_disponivel', '>', 0)
        .where('status', 'ATIVO');

      // Aplicar ordenação baseada na política
      switch (politica) {
        case 'FIFO':
          query = query.orderBy('data_fabricacao', 'asc');
          break;
        case 'FEFO':
          query = query.orderBy('data_validade', 'asc');
          break;
        case 'LIFO':
          query = query.orderBy('data_fabricacao', 'desc');
          break;
        default:
          query = query.orderBy('data_fabricacao', 'asc');
      }

      return await query;

    } catch (error) {
      console.error('Erro ao obter lotes disponíveis:', error);
      throw new Error('Erro ao consultar lotes: ' + error.message);
    }
  }

  /**
   * Verificar e gerar alertas de estoque
   */
  async verificarAlertas(idProduto, idDeposito = null) {
    try {
      // Buscar configurações de alerta para o produto
      let queryConfig = db.getInstance()(this.tableConfiguracaoAlertas)
        .where('id_produto', idProduto)
        .where('ativo', true);

      if (idDeposito) {
        queryConfig = queryConfig.where(function() {
          this.where('id_deposito', idDeposito).orWhereNull('id_deposito');
        });
      }

      const configuracoes = await queryConfig;

      for (const config of configuracoes) {
        const saldo = await this.obterSaldoProduto(
          idProduto,
          config.id_deposito || idDeposito
        );

        if (!saldo) continue;

        await this.verificarAlertaEspecifico(config, saldo);
      }

    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
    }
  }

  /**
   * Verificar alerta específico
   */
  async verificarAlertaEspecifico(configuracao, saldo) {
    try {
      const { tipo_alerta, valor_limite } = configuracao;
      let deveGerarAlerta = false;
      let valorAtual = 0;

      switch (tipo_alerta) {
        case 'MINIMO':
          valorAtual = saldo.quantidade_disponivel;
          deveGerarAlerta = valorAtual <= valor_limite;
          break;

        case 'MAXIMO':
          valorAtual = saldo.quantidade_total;
          deveGerarAlerta = valorAtual >= valor_limite;
          break;

        case 'RUPTURA':
          valorAtual = saldo.quantidade_disponivel;
          deveGerarAlerta = valorAtual === 0;
          break;

        case 'VENCIMENTO':
          // Verificar lotes próximos ao vencimento
          const lotesVencendo = await this.verificarLotesVencimento(
            saldo.id_produto,
            saldo.id_deposito,
            configuracao.dias_antecedencia || 30
          );
          deveGerarAlerta = lotesVencendo.length > 0;
          break;
      }

      if (deveGerarAlerta) {
        await this.gerarAlerta(configuracao, saldo, valorAtual);
      }

    } catch (error) {
      console.error('Erro ao verificar alerta específico:', error);
    }
  }

  /**
   * Gerar alerta de estoque
   */
  async gerarAlerta(configuracao, saldo, valorAtual) {
    try {
      // Verificar se alerta recente já foi gerado
      const alertaRecente = await db.getInstance()(this.tableAlertasGerados)
        .where('id_configuracao', configuracao.id_configuracao)
        .where('id_produto', saldo.id_produto)
        .where('data_geracao', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24 horas
        .where('status', '!=', 'RESOLVIDO')
        .first();

      if (alertaRecente) {
        return; // Não gerar alerta duplicado
      }

      // Buscar dados do produto
      const produto = await db.getInstance()('prd_03_produtos')
        .where('id_produto', saldo.id_produto)
        .first();

      // Buscar dados do depósito
      let deposito = null;
      if (saldo.id_deposito) {
        deposito = await db.getInstance()('loc_01_depositos')
          .where('id_deposito', saldo.id_deposito)
          .first();
      }

      // Determinar criticidade
      const criticidade = this.alertaModel.determinarCriticidade(
        configuracao.tipo_alerta,
        valorAtual,
        configuracao.valor_limite
      );

      // Gerar título e mensagem
      const titulo = this.alertaModel.gerarTituloAlerta(
        configuracao.tipo_alerta,
        produto,
        deposito
      );

      const mensagem = this.alertaModel.gerarMensagemAlerta(
        configuracao.tipo_alerta,
        {
          produto,
          deposito,
          valorAtual,
          valorLimite: configuracao.valor_limite
        }
      );

      // Criar alerta
      const alerta = {
        id_configuracao: configuracao.id_configuracao,
        id_produto: saldo.id_produto,
        id_deposito: saldo.id_deposito,
        tipo_alerta: configuracao.tipo_alerta,
        titulo,
        mensagem,
        valor_atual: valorAtual,
        valor_limite: configuracao.valor_limite,
        criticidade,
        status: 'PENDENTE',
        data_geracao: new Date()
      };

      await db.getInstance()(this.tableAlertasGerados)
        .insert(alerta);

      console.log(`Alerta gerado: ${titulo}`);

    } catch (error) {
      console.error('Erro ao gerar alerta:', error);
    }
  }

  /**
   * Verificar lotes próximos ao vencimento
   */
  async verificarLotesVencimento(idProduto, idDeposito, diasAntecedencia) {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

      return await db.getInstance()(this.tableLotes)
        .select('*')
        .where('id_produto', idProduto)
        .where('id_deposito', idDeposito)
        .where('quantidade_disponivel', '>', 0)
        .where('data_validade', '<=', dataLimite)
        .where('status', 'ATIVO')
        .orderBy('data_validade', 'asc');

    } catch (error) {
      console.error('Erro ao verificar lotes vencimento:', error);
      return [];
    }
  }

  /**
   * Obter movimentações de estoque
   */
  async obterMovimentacoes(filtros = {}) {
    try {
      const {
        id_produto,
        id_deposito,
        tipo_movimentacao,
        data_inicio,
        data_fim,
        limite = 50,
        offset = 0
      } = filtros;

      let query = db.getInstance()(this.tableMovimentacoes)
        .select([
          'mov.*',
          'p.descricao as produto_descricao',
          'p.codigo as produto_codigo',
          'd.descricao as deposito_descricao'
        ])
        .from(`${this.tableMovimentacoes} as mov`)
        .leftJoin('prd_03_produtos as p', 'mov.id_produto', 'p.id_produto')
        .leftJoin('loc_01_depositos as d', 'mov.id_deposito', 'd.id_deposito');

      if (id_produto) {
        query = query.where('mov.id_produto', id_produto);
      }

      if (id_deposito) {
        query = query.where('mov.id_deposito', id_deposito);
      }

      if (tipo_movimentacao) {
        query = query.where('mov.tipo_movimentacao', tipo_movimentacao);
      }

      if (data_inicio) {
        query = query.where('mov.data_movimentacao', '>=', data_inicio);
      }

      if (data_fim) {
        query = query.where('mov.data_movimentacao', '<=', data_fim);
      }

      const total = await query.clone().count('mov.id_movimentacao as count').first();
      const movimentacoes = await query
        .orderBy('mov.data_movimentacao', 'desc')
        .limit(limite)
        .offset(offset);

      return {
        data: movimentacoes,
        total: parseInt(total.count),
        limite,
        offset
      };

    } catch (error) {
      console.error('Erro ao obter movimentações:', error);
      throw new Error('Erro ao consultar movimentações: ' + error.message);
    }
  }

  /**
   * Gerar relatório de estoque
   */
  async gerarRelatorioEstoque(filtros = {}) {
    try {
      const {
        id_produto,
        id_deposito,
        incluir_zerados = false,
        incluir_lotes = false
      } = filtros;

      let query = db.getInstance()(this.tableSaldos)
        .select([
          's.*',
          'p.codigo as produto_codigo',
          'p.descricao as produto_descricao',
          'p.unidade_medida',
          'p.preco_venda',
          'd.descricao as deposito_descricao'
        ])
        .from(`${this.tableSaldos} as s`)
        .leftJoin('prd_03_produtos as p', 's.id_produto', 'p.id_produto')
        .leftJoin('loc_01_depositos as d', 's.id_deposito', 'd.id_deposito');

      if (id_produto) {
        query = query.where('s.id_produto', id_produto);
      }

      if (id_deposito) {
        query = query.where('s.id_deposito', id_deposito);
      }

      if (!incluir_zerados) {
        query = query.where('s.quantidade_total', '>', 0);
      }

      const saldos = await query.orderBy('p.descricao', 'asc');

      // Incluir dados de lotes se solicitado
      if (incluir_lotes) {
        for (const saldo of saldos) {
          saldo.lotes = await db.getInstance()(this.tableLotes)
            .select('*')
            .where('id_produto', saldo.id_produto)
            .where('id_deposito', saldo.id_deposito)
            .where('quantidade_disponivel', '>', 0)
            .orderBy('data_validade', 'asc');
        }
      }

      // Calcular totais
      const totais = {
        total_produtos: saldos.length,
        valor_total_estoque: saldos.reduce((acc, item) => {
          return acc + (item.quantidade_total * item.custo_medio);
        }, 0),
        quantidade_total: saldos.reduce((acc, item) => {
          return acc + item.quantidade_total;
        }, 0)
      };

      return {
        data: saldos,
        totais,
        gerado_em: new Date()
      };

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw new Error('Erro ao gerar relatório de estoque: ' + error.message);
    }
  }
}

module.exports = new EstoqueService();