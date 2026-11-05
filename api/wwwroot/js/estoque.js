/* Tela de Estoque: situação por produto, resumo por categoria e sugestão de compra. */
(function () {
  'use strict';

  const usuario = ERP.montarPagina({ id: 'estoque' });
  if (!usuario) return;

  const $ = id => document.getElementById(id);
  const ROTULO_SITUACAO = { CRITICO: 'Crítico', BAIXO: 'Baixo', NORMAL: 'Normal' };

  let ativos = [];      // produtos ativos (lista completa; os filtros agem em cima dela)
  let sugestao = [];    // última sugestão de compra calculada

  function mostrarErro(texto) { $('aviso-erro').textContent = texto; $('aviso-erro').hidden = false; }

  // ------------------------------------------------------------ cards
  function desenharCards() {
    const conta = s => ativos.filter(p => p.statusEstoque === s).length;
    $('kpi-critico').textContent = ERP.inteiro(conta('CRITICO'));
    $('kpi-baixo').textContent = ERP.inteiro(conta('BAIXO'));
    $('kpi-normal').textContent = ERP.inteiro(conta('NORMAL'));
    $('kpi-minimo').textContent = ERP.inteiro(ativos.filter(p => p.abaixoMinimo).length);
  }

  // ------------------------------------------------------------ situação por produto
  function desenharSituacao() {
    const cat = $('f-categoria').value;
    const sit = $('f-situacao').value;
    const soMinimo = $('f-minimo').checked;

    const lista = ativos.filter(p =>
      (!cat || String(p.categoriaId) === cat) &&
      (!sit || p.statusEstoque === sit) &&
      (!soMinimo || p.abaixoMinimo));

    $('resumo').textContent = lista.length === 1 ? '1 produto' : lista.length + ' produtos';
    const alvo = $('tabela-situacao');

    if (lista.length === 0) { alvo.innerHTML = '<p class="vazio">Nenhum produto com esses filtros.</p>'; return; }

    alvo.innerHTML = `
      <table>
        <caption class="so-leitor">Situação do estoque por produto</caption>
        <thead><tr>
          <th scope="col">Código</th><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Fornecedor</th>
          <th scope="col" class="num">Estoque</th><th scope="col" class="num">Mínimo</th>
          <th scope="col">Situação</th><th scope="col">Abaixo do mínimo</th>
        </tr></thead>
        <tbody>${lista.map(p => `
          <tr>
            <td>${ERP.esc(p.codigo)}</td>
            <td>${ERP.esc(p.nome)}</td>
            <td>${ERP.esc(p.categoria)}</td>
            <td>${ERP.esc(p.fornecedor || '—')}</td>
            <td class="num">${ERP.inteiro(p.estoqueAtual)}</td>
            <td class="num">${ERP.inteiro(p.estoqueMinimo)}</td>
            <td><span class="selo ${ERP.esc(p.statusEstoque)}">${ERP.esc(ROTULO_SITUACAO[p.statusEstoque] || p.statusEstoque)}</span></td>
            <td>${p.abaixoMinimo ? '<span class="selo SIM">Sim</span>' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  // ------------------------------------------------------------ resumo por categoria
  function desenharCategorias(lista) {
    const alvo = $('tabela-categorias');
    if (!lista || lista.length === 0) { alvo.innerHTML = '<p class="vazio">Sem dados.</p>'; return; }

    const soma = campo => lista.reduce((t, c) => t + (Number(c[campo]) || 0), 0);
    alvo.innerHTML = `
      <table>
        <caption class="so-leitor">Resumo do estoque por categoria</caption>
        <thead><tr>
          <th scope="col">Categoria</th><th scope="col" class="num">Produtos</th><th scope="col" class="num">Unidades</th>
          <th scope="col" class="num">Valor em estoque (custo)</th><th scope="col" class="num">Críticos</th>
        </tr></thead>
        <tbody>${lista.map(c => `
          <tr>
            <td>${ERP.esc(c.categoria)}</td>
            <td class="num">${ERP.inteiro(c.produtos)}</td>
            <td class="num">${ERP.inteiro(c.unidades)}</td>
            <td class="num">${ERP.moeda(c.valorEstoque)}</td>
            <td class="num">${ERP.inteiro(c.criticos)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td>Total</td>
          <td class="num">${ERP.inteiro(soma('produtos'))}</td>
          <td class="num">${ERP.inteiro(soma('unidades'))}</td>
          <td class="num">${ERP.moeda(soma('valorEstoque'))}</td>
          <td class="num">${ERP.inteiro(soma('criticos'))}</td>
        </tr></tfoot>
      </table>`;
  }

  // ------------------------------------------------------------ sugestão de compra
  function desenharSugestao() {
    const alvo = $('tabela-sugestao');
    $('btn-csv').disabled = sugestao.length === 0;

    if (sugestao.length === 0) {
      $('resumo-sugestao').textContent = '';
      alvo.innerHTML = '<p class="vazio">Nenhum produto abaixo do estoque ideal. Não há nada para comprar.</p>';
      return;
    }

    const totalQtd = sugestao.reduce((t, s) => t + (Number(s.qtdComprar) || 0), 0);
    const totalCusto = sugestao.reduce((t, s) => t + (Number(s.custoEstimado) || 0), 0);
    $('resumo-sugestao').textContent = sugestao.length + (sugestao.length === 1 ? ' produto' : ' produtos') +
      ' para repor · ' + ERP.inteiro(totalQtd) + ' unidades · custo estimado ' + ERP.moeda(totalCusto);

    alvo.innerHTML = `
      <table>
        <caption class="so-leitor">Sugestão de compra para atingir o estoque ideal</caption>
        <thead><tr>
          <th scope="col">Código</th><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Fornecedor</th>
          <th scope="col" class="num">Estoque atual</th><th scope="col" class="num">Ideal</th>
          <th scope="col" class="num">Comprar</th><th scope="col" class="num">Custo estimado</th>
        </tr></thead>
        <tbody>${sugestao.map(s => `
          <tr>
            <td>${ERP.esc(s.codigo)}</td>
            <td>${ERP.esc(s.nome)}</td>
            <td>${ERP.esc(s.categoria)}</td>
            <td>${ERP.esc(s.fornecedor)}</td>
            <td class="num">${ERP.inteiro(s.estoqueAtual)}</td>
            <td class="num">${ERP.inteiro(s.estoqueIdeal)}</td>
            <td class="num">${ERP.inteiro(s.qtdComprar)}</td>
            <td class="num">${ERP.moeda(s.custoEstimado)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="6">Total</td>
          <td class="num">${ERP.inteiro(totalQtd)}</td>
          <td class="num">${ERP.moeda(totalCusto)}</td>
        </tr></tfoot>
      </table>`;
  }

  async function calcularSugestao(ev) {
    if (ev) ev.preventDefault();
    const erro = $('erro-sugestao');
    erro.hidden = true;

    const ideal = Number($('s-ideal').value);
    if (!Number.isInteger(ideal) || ideal < 1 || ideal > 100000) {
      erro.textContent = 'Informe um estoque ideal inteiro, entre 1 e 100.000.';
      erro.hidden = false;
      $('s-ideal').focus();
      return;
    }

    const botao = $('btn-calcular');
    botao.disabled = true;
    botao.textContent = 'Calculando...';
    try {
      sugestao = await ERP.api('/api/relatorios/sugestao-compra?estoqueIdeal=' + ideal);
      desenharSugestao();
    } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
    } finally {
      botao.disabled = false;
      botao.textContent = 'Calcular sugestão';
    }
  }

  // Exporta a sugestão em CSV (separador ";" e BOM, para abrir certo no Excel em português)
  function textoCsv(v) {
    let t = String(v ?? '');
    if (/^[=+\-@]/.test(t)) t = "'" + t;   // evita que o Excel trate texto como fórmula
    return '"' + t.replace(/"/g, '""') + '"';
  }
  function exportarCsv() {
    if (sugestao.length === 0) return;
    const cab = ['Código', 'Produto', 'Categoria', 'Fornecedor', 'Estoque atual', 'Estoque ideal', 'Qtd a comprar', 'Custo estimado (R$)'];
    const linhas = sugestao.map(s => [
      textoCsv(s.codigo), textoCsv(s.nome), textoCsv(s.categoria), textoCsv(s.fornecedor),
      s.estoqueAtual, s.estoqueIdeal, s.qtdComprar,
      Number(s.custoEstimado).toFixed(2).replace('.', ',')
    ].join(';'));
    const csv = '\ufeff' + [cab.map(textoCsv).join(';')].concat(linhas).join('\r\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sugestao-de-compra.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ------------------------------------------------------------ carga
  async function carregar() {
    $('aviso-erro').hidden = true;
    const botao = $('btn-atualizar');
    botao.disabled = true;
    try {
      const [produtos, categorias, porCategoria] = await Promise.all([
        ERP.api('/api/produtos?status=ATIVO'),
        ERP.api('/api/categorias'),
        ERP.api('/api/relatorios/por-categoria')
      ]);
      ativos = produtos;

      const escolhida = $('f-categoria').value;
      $('f-categoria').innerHTML = '<option value="">Todas</option>' +
        categorias.map(c => `<option value="${c.id}">${ERP.esc(c.nome)}</option>`).join('');
      $('f-categoria').value = escolhida;

      desenharCards();
      desenharSituacao();
      desenharCategorias(porCategoria);
      await calcularSugestao();

      $('atualizado').textContent = 'Situação das peças e sugestão de compra · atualizado às ' +
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      mostrarErro(e.message);
      $('resumo').textContent = '';
    } finally {
      botao.disabled = false;
    }
  }

  // ------------------------------------------------------------ eventos
  $('form-filtros').addEventListener('submit', ev => ev.preventDefault());
  ['f-categoria', 'f-situacao', 'f-minimo'].forEach(id => $(id).addEventListener('change', desenharSituacao));
  $('btn-limpar').addEventListener('click', () => { $('form-filtros').reset(); desenharSituacao(); });
  $('form-sugestao').addEventListener('submit', calcularSugestao);
  $('btn-csv').addEventListener('click', exportarCsv);
  $('btn-atualizar').addEventListener('click', carregar);

  carregar();
})();
