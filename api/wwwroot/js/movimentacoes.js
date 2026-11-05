/* Tela de Movimentações: registrar entrada/saída e consultar o histórico. */
(function () {
  'use strict';

  const usuario = ERP.montarPagina({ id: 'movimentacoes' });
  if (!usuario) return;

  const $ = id => document.getElementById(id);
  const ROTULO_SITUACAO = { CRITICO: 'Crítico', BAIXO: 'Baixo', NORMAL: 'Normal' };
  const ROTULO_TIPO = { ENTRADA: 'Entrada', SAIDA: 'Saída' };

  let produtos = [];
  let historico = [];

  // ------------------------------------------------------------ avisos
  function avisoOk(t) { $('aviso-erro').hidden = true; $('aviso-ok').textContent = t; $('aviso-ok').hidden = false; }
  function avisoErro(t) { $('aviso-ok').hidden = true; $('aviso-erro').textContent = t; $('aviso-erro').hidden = false; }

  // ------------------------------------------------------------ produtos (select + info)
  const produtoPorId = id => produtos.find(p => p.id === Number(id));
  const tipoEscolhido = () => document.querySelector('input[name="tipo"]:checked').value;

  function preencherSelects(manterProduto) {
    const ativos = produtos.filter(p => p.status === 'ATIVO');
    $('m-produto').innerHTML = '<option value="">Selecione o produto...</option>' +
      ativos.map(p => `<option value="${p.id}">${ERP.esc(p.codigo)} · ${ERP.esc(p.nome)} (estoque: ${ERP.inteiro(p.estoqueAtual)})</option>`).join('');
    if (manterProduto) $('m-produto').value = manterProduto;

    const filtroAtual = $('h-produto').value;
    $('h-produto').innerHTML = '<option value="">Todos</option>' +
      produtos.map(p => `<option value="${p.id}">${ERP.esc(p.codigo)} · ${ERP.esc(p.nome)}</option>`).join('');
    $('h-produto').value = filtroAtual;
  }

  function mostrarInfoProduto() {
    const alvo = $('info-produto');
    const p = produtoPorId($('m-produto').value);
    if (!p) { alvo.hidden = true; return; }
    alvo.innerHTML = `Estoque atual: <strong>${ERP.inteiro(p.estoqueAtual)}</strong> unidades · mínimo: ${ERP.inteiro(p.estoqueMinimo)} · situação: ` +
      `<span class="selo ${ERP.esc(p.statusEstoque)}">${ERP.esc(ROTULO_SITUACAO[p.statusEstoque] || p.statusEstoque)}</span>`;
    alvo.hidden = false;
  }

  async function carregarProdutos(manterProduto) {
    produtos = await ERP.api('/api/produtos');
    preencherSelects(manterProduto);
    mostrarInfoProduto();
  }

  // ------------------------------------------------------------ histórico
  function desenharHistorico() {
    $('resumo').textContent = historico.length === 1 ? '1 registro' : historico.length + ' registros';
    const area = $('tabela-area');
    if (historico.length === 0) {
      area.innerHTML = '<p class="vazio">Nenhuma movimentação encontrada.</p>';
      return;
    }
    area.innerHTML = `
      <table>
        <caption class="so-leitor">Histórico de movimentações de estoque</caption>
        <thead><tr>
          <th scope="col">Data</th><th scope="col">Produto</th><th scope="col">Tipo</th>
          <th scope="col" class="num">Qtd.</th><th scope="col" class="num">Antes</th><th scope="col" class="num">Depois</th>
          <th scope="col">Motivo</th><th scope="col">Usuário</th>
        </tr></thead>
        <tbody>${historico.map(m => `
          <tr>
            <td>${ERP.esc(ERP.dataHora(m.criadoEm))}</td>
            <td>${ERP.esc(m.produtoCodigo)} · ${ERP.esc(m.produtoNome)}</td>
            <td><span class="selo ${ERP.esc(m.tipo)}">${ERP.esc(ROTULO_TIPO[m.tipo] || m.tipo)}</span></td>
            <td class="num">${ERP.inteiro(m.quantidade)}</td>
            <td class="num">${ERP.inteiro(m.estoqueAnterior)}</td>
            <td class="num">${ERP.inteiro(m.estoqueFinal)}</td>
            <td>${ERP.esc(m.motivo || '—')}</td>
            <td>${ERP.esc(m.usuario)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  async function carregarHistorico() {
    const p = new URLSearchParams();
    if ($('h-produto').value) p.set('produtoId', $('h-produto').value);
    if ($('h-tipo').value) p.set('tipo', $('h-tipo').value);
    p.set('limite', $('h-limite').value);
    try {
      historico = await ERP.api('/api/movimentacoes?' + p.toString());
      desenharHistorico();
    } catch (e) {
      avisoErro(e.message);
      $('resumo').textContent = '';
    }
  }

  // ------------------------------------------------------------ registrar
  async function registrar(ev) {
    ev.preventDefault();
    $('aviso-ok').hidden = true;
    $('aviso-erro').hidden = true;

    const produto = produtoPorId($('m-produto').value);
    const tipo = tipoEscolhido();
    const qtd = Number($('m-qtd').value);
    const motivo = $('m-motivo').value.trim();

    if (!produto) { avisoErro('Escolha o produto.'); $('m-produto').focus(); return; }
    if (!Number.isInteger(qtd) || qtd <= 0) { avisoErro('Informe uma quantidade inteira maior que zero.'); $('m-qtd').focus(); return; }
    if (tipo === 'SAIDA' && qtd > produto.estoqueAtual) {
      avisoErro('Estoque insuficiente: "' + produto.nome + '" tem ' + ERP.inteiro(produto.estoqueAtual) + ' unidades e você pediu ' + ERP.inteiro(qtd) + '.');
      $('m-qtd').focus();
      return;
    }

    const botao = $('btn-registrar');
    botao.disabled = true;
    botao.textContent = 'Registrando...';
    try {
      const r = await ERP.api('/api/movimentacoes', {
        method: 'POST',
        body: { produtoId: produto.id, tipo: tipo, quantidade: qtd, motivo: motivo || null }
      });
      await carregarProdutos(String(produto.id));
      await carregarHistorico();

      const reg = historico.find(m => m.id === (r && r.id));
      const detalhe = reg ? ' Estoque de "' + produto.nome + '": ' + ERP.inteiro(reg.estoqueAnterior) + ' → ' + ERP.inteiro(reg.estoqueFinal) + '.' : '';
      avisoOk((tipo === 'ENTRADA' ? 'Entrada' : 'Saída') + ' de ' + ERP.inteiro(qtd) + ' unidade(s) registrada.' + detalhe);
      $('m-qtd').value = '';
      $('m-motivo').value = '';
      $('m-qtd').focus();
    } catch (e) {
      avisoErro(e.message);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Registrar movimentação';
    }
  }

  // ------------------------------------------------------------ eventos
  $('form-mov').addEventListener('submit', registrar);
  $('m-produto').addEventListener('change', mostrarInfoProduto);
  $('form-filtros').addEventListener('submit', ev => ev.preventDefault());
  ['h-produto', 'h-tipo', 'h-limite'].forEach(id => $(id).addEventListener('change', carregarHistorico));

  // ------------------------------------------------------------ início
  (async function iniciar() {
    try {
      const pre = new URLSearchParams(window.location.search).get('produto');   // vem do botão "Movimentar"
      await carregarProdutos(pre);
      mostrarInfoProduto();
      if (pre && produtoPorId(pre)) $('m-qtd').focus();
    } catch (e) {
      avisoErro(e.message);
    }
    await carregarHistorico();
  })();
})();
