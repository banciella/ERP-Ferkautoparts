/* =====================================================================
   ERP Ferkautoparts - PIM IV  |  Código compartilhado por todas as telas
   - sessão (login / logout)   - chamadas à API   - menu
   - acessibilidade (fonte, alto contraste, VLibras)
   ===================================================================== */
(function () {
  'use strict';

  const CHAVE_TOKEN = 'erp_token';
  const CHAVE_USUARIO = 'erp_usuario';
  const CHAVE_FONTE = 'erp_fonte';
  const CHAVE_CONTRASTE = 'erp_contraste';

  // Telas do sistema. "pronto: false" aparece no menu como "em breve".
  const PAGINAS = [
    { id: 'dashboard',     nome: 'Dashboard',     url: 'dashboard.html',     pronto: true },
    { id: 'produtos',      nome: 'Produtos',      url: 'produtos.html',      pronto: true },
    { id: 'movimentacoes', nome: 'Movimentações', url: 'movimentacoes.html', pronto: true },
    { id: 'estoque',       nome: 'Estoque',       url: 'estoque.html',       pronto: true },
    { id: 'admin',         nome: 'Admin',         url: 'admin.html',         pronto: true, soAdmin: true }
  ];

  // ------------------------------------------------------------ utilidades
  function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const moeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
  const inteiro = v => new Intl.NumberFormat('pt-BR').format(Number(v) || 0);
  const dataHora = iso => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  // ------------------------------------------------------------ sessão
  const getToken = () => sessionStorage.getItem(CHAVE_TOKEN);
  function getUsuario() {
    try { return JSON.parse(sessionStorage.getItem(CHAVE_USUARIO)); } catch (e) { return null; }
  }
  function salvarSessao(token, usuario) {
    sessionStorage.setItem(CHAVE_TOKEN, token);
    sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  }
  function sair() {
    sessionStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_USUARIO);
    window.location.href = 'index.html';
  }
  function exigirLogin(soAdmin) {
    const u = getUsuario();
    if (!getToken() || !u) { sair(); return null; }
    if (soAdmin && u.perfil !== 'ADMIN') { window.location.href = 'dashboard.html'; return null; }
    return u;
  }

  // ------------------------------------------------------------ API
  async function api(caminho, opcoes) {
    opcoes = opcoes || {};
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    let resp;
    try {
      resp = await fetch(caminho, {
        method: opcoes.method || 'GET',
        headers,
        body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
      });
    } catch (e) {
      throw new Error('Não foi possível conectar à API. Verifique se ela está rodando.');
    }

    if (resp.status === 401 && !opcoes.semRedirecionar) {
      sair();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (resp.status === 403) throw new Error('Você não tem permissão para esta ação.');
    if (resp.status === 204) return null;

    let corpo = null;
    try { corpo = await resp.json(); } catch (e) { /* resposta sem corpo */ }
    if (!resp.ok) throw new Error((corpo && corpo.erro) || ('Erro ' + resp.status));
    return corpo;
  }

  // ------------------------------------------------------------ acessibilidade
  function aplicarPreferencias() {
    const fonte = parseInt(localStorage.getItem(CHAVE_FONTE) || '100', 10);
    document.documentElement.style.fontSize = fonte + '%';
    document.body.classList.toggle('alto-contraste', localStorage.getItem(CHAVE_CONTRASTE) === '1');
  }

  function mudarFonte(delta) {
    let fonte = parseInt(localStorage.getItem(CHAVE_FONTE) || '100', 10);
    fonte = delta === 0 ? 100 : Math.min(150, Math.max(80, fonte + delta));
    localStorage.setItem(CHAVE_FONTE, String(fonte));
    aplicarPreferencias();
  }

  function alternarContraste(botao) {
    const ligado = localStorage.getItem(CHAVE_CONTRASTE) === '1';
    localStorage.setItem(CHAVE_CONTRASTE, ligado ? '0' : '1');
    aplicarPreferencias();
    botao.setAttribute('aria-pressed', ligado ? 'false' : 'true');
  }

  function carregarVLibras() {
    if (document.querySelector('[vw]')) return;
    const caixa = document.createElement('div');
    caixa.setAttribute('vw', '');
    caixa.className = 'enabled';
    caixa.innerHTML =
      '<div vw-access-button class="active"></div>' +
      '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(caixa);

    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = function () {
      try { new window.VLibras.Widget('https://vlibras.gov.br/app'); } catch (e) { /* bloqueado pela rede */ }
    };
    script.onerror = function () { /* rede da empresa pode bloquear: o resto do sistema segue normal */ };
    document.body.appendChild(script);
  }

  function htmlBarraAcessibilidade() {
    const contraste = localStorage.getItem(CHAVE_CONTRASTE) === '1';
    return `
      <div class="barra-acess" role="region" aria-label="Recursos de acessibilidade">
        <span>Acessibilidade</span>
        <button type="button" id="acess-menos" aria-label="Diminuir tamanho da fonte">A-</button>
        <button type="button" id="acess-normal" aria-label="Tamanho padrão da fonte">A</button>
        <button type="button" id="acess-mais" aria-label="Aumentar tamanho da fonte">A+</button>
        <button type="button" id="acess-contraste" aria-pressed="${contraste}">Alto contraste</button>
      </div>`;
  }

  function htmlCabecalho(paginaAtual, usuario) {
    const links = PAGINAS
      .filter(p => !p.soAdmin || usuario.perfil === 'ADMIN')
      .map(p => {
        if (!p.pronto) return `<span aria-disabled="true" title="Em breve">${esc(p.nome)} (em breve)</span>`;
        const atual = p.id === paginaAtual ? ' aria-current="page"' : '';
        return `<a href="${p.url}"${atual}>${esc(p.nome)}</a>`;
      }).join('');
    return `
      <header class="topo">
        <div class="marca">ERP Ferkautoparts<small>Controle de estoque · PIM IV</small></div>
        <nav class="menu" aria-label="Menu principal">${links}</nav>
        <div class="usuario">
          <span>${esc(usuario.nome)}</span>
          <span class="perfil">${esc(usuario.perfil)}</span>
          <button type="button" class="btn-sair" id="btn-sair">Sair</button>
        </div>
      </header>`;
  }

  function ligarBarraAcessibilidade() {
    document.getElementById('acess-menos').addEventListener('click', () => mudarFonte(-10));
    document.getElementById('acess-normal').addEventListener('click', () => mudarFonte(0));
    document.getElementById('acess-mais').addEventListener('click', () => mudarFonte(10));
    const c = document.getElementById('acess-contraste');
    c.addEventListener('click', () => alternarContraste(c));
  }

  /**
   * Monta a página (barra de acessibilidade + menu) e devolve o usuário logado.
   * opcoes: { id: 'dashboard', publica: false, soAdmin: false }
   */
  function montarPagina(opcoes) {
    opcoes = opcoes || {};
    aplicarPreferencias();

    let usuario = null;
    if (!opcoes.publica) {
      usuario = exigirLogin(opcoes.soAdmin);
      if (!usuario) return null;
    }

    const topo = document.createElement('div');
    topo.innerHTML =
      '<a class="pular" href="#conteudo">Pular para o conteúdo</a>' +
      htmlBarraAcessibilidade() +
      (usuario ? htmlCabecalho(opcoes.id, usuario) : '');
    document.body.prepend(...topo.childNodes);

    ligarBarraAcessibilidade();
    const btnSair = document.getElementById('btn-sair');
    if (btnSair) btnSair.addEventListener('click', sair);

    carregarVLibras();
    return usuario;
  }

  window.ERP = { esc, moeda, inteiro, dataHora, api, getToken, getUsuario, salvarSessao, sair, montarPagina };
})();
