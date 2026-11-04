/* Dashboard: busca /api/dashboard e desenha cards, tabela e gráficos (sem biblioteca externa) */
(function () {
  'use strict';

  const usuario = ERP.montarPagina({ id: 'dashboard' });
  if (!usuario) return;

  const $ = id => document.getElementById(id);
  const ROTULO_SITUACAO = { CRITICO: 'Crítico', BAIXO: 'Baixo', NORMAL: 'Normal' };

  function ultimos7Dias() {
    // A API agrupa os dias em UTC (data do servidor), então usamos UTC aqui também
    const dias = [];
    const hoje = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - i));
      dias.push(d.toISOString().slice(0, 10));
    }
    return dias;
  }
  const rotuloDia = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);

  function desenharCards(d) {
    $('kpi-produtos').textContent = ERP.inteiro(d.produtosAtivos);
    $('kpi-unidades').textContent = ERP.inteiro(d.unidadesEmEstoque);
    $('kpi-valor').textContent = ERP.moeda(d.valorEstoque);
    $('kpi-criticos').textContent = ERP.inteiro(d.totalCriticos);
  }

  function desenharCriticos(lista) {
    const alvo = $('lista-criticos');
    if (!lista || lista.length === 0) {
      alvo.innerHTML = '<p class="vazio">Nenhum produto crítico no momento.</p>';
      return;
    }
    const linhas = lista.map(p => `
      <tr>
        <td>${ERP.esc(p.codigo)}</td>
        <td>${ERP.esc(p.nome)}</td>
        <td>${ERP.esc(p.categoria)}</td>
        <td class="num">${ERP.inteiro(p.estoqueAtual)}</td>
        <td class="num">${ERP.inteiro(p.estoqueMinimo)}</td>
        <td><span class="selo ${ERP.esc(p.statusEstoque)}">${ERP.esc(ROTULO_SITUACAO[p.statusEstoque] || p.statusEstoque)}</span></td>
      </tr>`).join('');
    alvo.innerHTML = `
      <div class="tabela-wrap">
        <table>
          <caption class="so-leitor">Produtos com estoque crítico ou abaixo do mínimo</caption>
          <thead><tr>
            <th scope="col">Código</th><th scope="col">Produto</th><th scope="col">Categoria</th>
            <th scope="col" class="num">Estoque</th><th scope="col" class="num">Mínimo</th><th scope="col">Situação</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
  }

  function desenharCategorias(lista) {
    const alvo = $('grafico-categorias');
    if (!lista || lista.length === 0) { alvo.innerHTML = '<li class="vazio">Sem dados.</li>'; return; }
    const maximo = Math.max(...lista.map(c => Number(c.unidades) || 0), 1);
    alvo.innerHTML = lista.map(c => {
      const pct = Math.round(((Number(c.unidades) || 0) / maximo) * 100);
      return `
        <li>
          <span>${ERP.esc(c.categoria)}</span>
          <span class="trilho" aria-hidden="true"><span class="preenche" style="display:block;width:${pct}%"></span></span>
          <span class="qtd">${ERP.inteiro(c.unidades)}</span>
        </li>`;
    }).join('');
  }

  function desenharMovimentos(movs) {
    const dias = ultimos7Dias();
    const mapa = {};
    dias.forEach(d => { mapa[d] = { ENTRADA: 0, SAIDA: 0 }; });
    (movs || []).forEach(m => {
      if (mapa[m.dia]) mapa[m.dia][m.tipo] = Number(m.total) || 0;
    });

    const maximo = Math.max(1, ...dias.map(d => Math.max(mapa[d].ENTRADA, mapa[d].SAIDA)));
    const altura = v => (v === 0 ? 1 : Math.max(4, Math.round((v / maximo) * 100)));

    $('grafico-movimentos').innerHTML = dias.map(d => `
      <div class="dia">
        <div class="par">
          <div class="col entrada" style="height:${altura(mapa[d].ENTRADA)}%">${mapa[d].ENTRADA ? '<b>' + mapa[d].ENTRADA + '</b>' : ''}</div>
          <div class="col saida" style="height:${altura(mapa[d].SAIDA)}%">${mapa[d].SAIDA ? '<b>' + mapa[d].SAIDA + '</b>' : ''}</div>
        </div>
      </div>`).join('');

    $('rotulos-movimentos').innerHTML = dias.map(d => `<span>${rotuloDia(d)}</span>`).join('');

    $('tabela-movimentos').innerHTML = dias.map(d => `
      <tr><td>${rotuloDia(d)}</td><td>${mapa[d].ENTRADA}</td><td>${mapa[d].SAIDA}</td></tr>`).join('');
  }

  async function carregar() {
    const status = $('status');
    const erro = $('erro');
    const botao = $('btn-atualizar');

    erro.hidden = true;
    status.hidden = false;
    status.textContent = 'Carregando dados...';
    botao.disabled = true;

    try {
      const d = await ERP.api('/api/dashboard');
      desenharCards(d);
      desenharCriticos(d.criticos);
      desenharCategorias(d.porCategoria);
      desenharMovimentos(d.movimentosUltimos7Dias);

      $('conteudo-dash').hidden = false;
      status.hidden = true;
      $('atualizado').textContent = 'Visão geral do estoque · atualizado às ' +
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      status.hidden = true;
      erro.textContent = e.message;
      erro.hidden = false;
    } finally {
      botao.disabled = false;
    }
  }

  $('btn-atualizar').addEventListener('click', carregar);
  carregar();
})();
