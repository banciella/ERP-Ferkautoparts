/* Área Admin: usuários, categorias, fornecedores e auditoria (só perfil ADMIN). */
(function () {
  'use strict';

  const usuario = ERP.montarPagina({ id: 'admin', soAdmin: true });
  if (!usuario) return;

  const $ = id => document.getElementById(id);

  // ------------------------------------------------------------ avisos
  function avisoOk(t) { $('aviso-erro').hidden = true; $('aviso-ok').textContent = t; $('aviso-ok').hidden = false; }
  function avisoErro(t) { $('aviso-ok').hidden = true; $('aviso-erro').textContent = t; $('aviso-erro').hidden = false; }
  function limparAvisos() { $('aviso-ok').hidden = true; $('aviso-erro').hidden = true; }

  // ------------------------------------------------------------ excluir (janela única, serve categorias e fornecedores)
  let pendenteExclusao = null;   // { cad, item }

  function pedirExclusao(cad, item) {
    pendenteExclusao = { cad, item };
    $('texto-excluir').textContent = 'Você vai excluir ' + cad.artigo + ' "' + item.nome + '". Essa ação não pode ser desfeita.';
    $('dlg-excluir').showModal();
  }

  async function confirmarExclusao() {
    if (!pendenteExclusao) return;
    const { cad, item } = pendenteExclusao;
    const botao = $('excluir-sim');
    botao.disabled = true;
    try {
      await ERP.api(cad.url + '/' + item.id, { method: 'DELETE' });
      $('dlg-excluir').close();
      avisoOk(cad.rotulo + ' "' + item.nome + '" excluíd' + cad.final + '.');
      await cad.carregar();
    } catch (e) {
      $('dlg-excluir').close();
      avisoErro(e.message);
    } finally {
      botao.disabled = false;
      pendenteExclusao = null;
    }
  }

  // ------------------------------------------------------------ cadastro simples (categorias e fornecedores)
  /**
   * cfg: { chave, url, rotulo, artigo, final, campos:[{id, prop, obrig, rotuloErro}], colunas:[{titulo, valor(i)}],
   *        tituloNovo, tituloEditar }
   */
  function criarCadastro(cfg) {
    let itens = [];
    let editando = null;
    const dlg = $('dlg-' + cfg.chave);
    const erroDlg = $('erro-' + cfg.chave);

    async function carregar() {
      try {
        itens = await ERP.api(cfg.url);
        desenhar();
      } catch (e) { avisoErro(e.message); }
    }

    function desenhar() {
      $('resumo-' + cfg.chave).textContent = itens.length === 1 ? '1 registro' : itens.length + ' registros';
      const area = $('area-' + cfg.chave);
      if (itens.length === 0) { area.innerHTML = '<p class="vazio">Nenhum registro cadastrado.</p>'; return; }
      area.innerHTML = `
        <table>
          <caption class="so-leitor">${ERP.esc(cfg.rotulo)}s cadastrad${cfg.final}s</caption>
          <thead><tr>${cfg.colunas.map(c => `<th scope="col">${ERP.esc(c.titulo)}</th>`).join('')}<th scope="col">Ações</th></tr></thead>
          <tbody>${itens.map(i => `
            <tr>
              ${cfg.colunas.map(c => `<td>${ERP.esc(c.valor(i))}</td>`).join('')}
              <td><div class="acoes">
                <button type="button" class="btn btn-claro btn-peq" data-acao="editar" data-id="${i.id}" aria-label="Editar ${ERP.esc(i.nome)}">Editar</button>
                <button type="button" class="btn btn-perigo btn-peq" data-acao="excluir" data-id="${i.id}" aria-label="Excluir ${ERP.esc(i.nome)}">Excluir</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    }

    function abrir(item) {
      editando = item ? item.id : null;
      erroDlg.hidden = true;
      $('titulo-' + cfg.chave).textContent = item ? cfg.tituloEditar : cfg.tituloNovo;
      cfg.campos.forEach(c => { $(c.id).value = item && item[c.prop] != null ? item[c.prop] : ''; });
      dlg.showModal();
      $(cfg.campos[0].id).focus();
    }

    async function salvar(ev) {
      ev.preventDefault();
      const corpo = {};
      for (const c of cfg.campos) {
        const v = $(c.id).value.trim();
        if (c.obrig && !v) { erroDlg.textContent = 'Informe ' + c.rotuloErro + '.'; erroDlg.hidden = false; $(c.id).focus(); return; }
        corpo[c.prop] = v || null;
      }
      erroDlg.hidden = true;

      const botao = dlg.querySelector('button[type="submit"]');
      botao.disabled = true;
      botao.textContent = 'Salvando...';
      try {
        if (editando === null) await ERP.api(cfg.url, { method: 'POST', body: corpo });
        else await ERP.api(cfg.url + '/' + editando, { method: 'PUT', body: corpo });
        dlg.close();
        avisoOk(cfg.rotulo + ' "' + corpo.nome + '" ' + (editando === null ? 'cadastrad' : 'atualizad') + cfg.final + ' com sucesso.');
        await carregar();
      } catch (e) {
        erroDlg.textContent = e.message;
        erroDlg.hidden = false;
      } finally {
        botao.disabled = false;
        botao.textContent = 'Salvar';
      }
    }

    $('novo-' + cfg.chave).addEventListener('click', () => { limparAvisos(); abrir(null); });
    $('form-' + cfg.chave).addEventListener('submit', salvar);
    $('area-' + cfg.chave).addEventListener('click', ev => {
      const b = ev.target.closest('button[data-acao]');
      if (!b) return;
      const item = itens.find(i => i.id === Number(b.dataset.id));
      if (!item) return;
      limparAvisos();
      if (b.dataset.acao === 'editar') abrir(item);
      else pedirExclusao(api, item);
    });

    const api = { url: cfg.url, rotulo: cfg.rotulo, artigo: cfg.artigo, final: cfg.final, carregar };
    return api;
  }

  const categorias = criarCadastro({
    chave: 'categorias', url: '/api/categorias', rotulo: 'Categoria', artigo: 'a categoria', final: 'a',
    tituloNovo: 'Nova categoria', tituloEditar: 'Editar categoria',
    campos: [
      { id: 'c-nome', prop: 'nome', obrig: true, rotuloErro: 'o nome da categoria' },
      { id: 'c-descricao', prop: 'descricao' }
    ],
    colunas: [
      { titulo: 'Nome', valor: i => i.nome },
      { titulo: 'Descrição', valor: i => i.descricao || '—' }
    ]
  });

  const fornecedores = criarCadastro({
    chave: 'fornecedores', url: '/api/fornecedores', rotulo: 'Fornecedor', artigo: 'o fornecedor', final: 'o',
    tituloNovo: 'Novo fornecedor', tituloEditar: 'Editar fornecedor',
    campos: [
      { id: 'f-nome', prop: 'nome', obrig: true, rotuloErro: 'o nome do fornecedor' },
      { id: 'f-cnpj', prop: 'cnpj' },
      { id: 'f-telefone', prop: 'telefone' },
      { id: 'f-email', prop: 'email' }
    ],
    colunas: [
      { titulo: 'Nome', valor: i => i.nome },
      { titulo: 'CNPJ', valor: i => i.cnpj || '—' },
      { titulo: 'Telefone', valor: i => i.telefone || '—' },
      { titulo: 'E-mail', valor: i => i.email || '—' }
    ]
  });

  // ------------------------------------------------------------ usuários
  let listaUsuarios = [];
  let editandoUsuario = null;

  async function carregarUsuarios() {
    try {
      listaUsuarios = await ERP.api('/api/usuarios');
      desenharUsuarios();
    } catch (e) { avisoErro(e.message); }
  }

  function desenharUsuarios() {
    $('resumo-usuarios').textContent = listaUsuarios.length === 1 ? '1 usuário' : listaUsuarios.length + ' usuários';
    const area = $('area-usuarios');
    if (listaUsuarios.length === 0) { area.innerHTML = '<p class="vazio">Nenhum usuário.</p>'; return; }
    area.innerHTML = `
      <table>
        <caption class="so-leitor">Usuários do sistema</caption>
        <thead><tr>
          <th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Perfil</th>
          <th scope="col">Situação</th><th scope="col">Criado em</th><th scope="col">Ações</th>
        </tr></thead>
        <tbody>${listaUsuarios.map(u => `
          <tr>
            <td>${ERP.esc(u.nome)}${u.id === usuario.id ? ' <em>(você)</em>' : ''}</td>
            <td>${ERP.esc(u.email)}</td>
            <td>${ERP.esc(u.perfil)}</td>
            <td><span class="selo ${u.ativo ? 'ATIVO' : 'INATIVO'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td>${ERP.esc(ERP.dataHora(u.criadoEm))}</td>
            <td><div class="acoes">
              <button type="button" class="btn btn-claro btn-peq" data-acao="editar" data-id="${u.id}" aria-label="Editar ${ERP.esc(u.nome)}">Editar</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function abrirUsuario(u) {
    editandoUsuario = u ? u.id : null;
    const proprio = !!u && u.id === usuario.id;
    $('erro-usuarios').hidden = true;
    $('titulo-usuarios').textContent = u ? 'Editar usuário' : 'Novo usuário';

    $('u-nome').value = u ? u.nome : '';
    $('u-email').value = u ? u.email : '';
    $('u-email').disabled = !!u;
    $('dica-email').hidden = !u;
    $('u-perfil').value = u ? u.perfil : 'OPERADOR';
    $('u-senha').value = '';
    $('rotulo-senha').innerHTML = u ? 'Nova senha (opcional)' : 'Senha <span class="obrigatorio" aria-hidden="true">*</span>';
    $('dica-senha').textContent = u ? 'Deixe em branco para manter a senha atual. Se preencher: mínimo de 6 caracteres.' : 'Mínimo de 6 caracteres.';

    $('campo-ativo').hidden = !u;
    $('u-ativo').checked = u ? u.ativo : true;
    $('u-ativo').disabled = proprio;
    $('u-perfil').disabled = proprio;
    $('dica-proprio').hidden = !proprio;

    $('dlg-usuarios').showModal();
    $('u-nome').focus();
  }

  async function salvarUsuario(ev) {
    ev.preventDefault();
    const erro = $('erro-usuarios');
    const nome = $('u-nome').value.trim();
    const email = $('u-email').value.trim();
    const perfil = $('u-perfil').value;
    const senha = $('u-senha').value;

    const falha = texto => { erro.textContent = texto; erro.hidden = false; };
    if (!nome) return falha('Informe o nome.');
    if (editandoUsuario === null && (!email || !email.includes('@'))) return falha('Informe um e-mail válido.');
    if (editandoUsuario === null && senha.length < 6) return falha('A senha deve ter pelo menos 6 caracteres.');
    if (editandoUsuario !== null && senha && senha.length < 6) return falha('A nova senha deve ter pelo menos 6 caracteres.');
    erro.hidden = true;

    const botao = $('form-usuarios').querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Salvando...';
    try {
      if (editandoUsuario === null) {
        await ERP.api('/api/usuarios', { method: 'POST', body: { nome, email, senha, perfil } });
        avisoOk('Usuário "' + nome + '" cadastrado com sucesso.');
      } else {
        await ERP.api('/api/usuarios/' + editandoUsuario, {
          method: 'PUT',
          body: { nome, perfil, ativo: $('u-ativo').checked, novaSenha: senha || null }
        });
        avisoOk('Usuário "' + nome + '" atualizado com sucesso.');
      }
      $('dlg-usuarios').close();
      await carregarUsuarios();
    } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
    } finally {
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  }

  $('novo-usuarios').addEventListener('click', () => { limparAvisos(); abrirUsuario(null); });
  $('form-usuarios').addEventListener('submit', salvarUsuario);
  $('area-usuarios').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-acao="editar"]');
    if (!b) return;
    const u = listaUsuarios.find(x => x.id === Number(b.dataset.id));
    if (u) { limparAvisos(); abrirUsuario(u); }
  });

  // ------------------------------------------------------------ auditoria
  const OPERACAO = { INSERT: 'Inclusão', UPDATE: 'Alteração', DELETE: 'Exclusão' };
  const NOME_TABELA = { produtos: 'Produtos', categorias: 'Categorias', fornecedores: 'Fornecedores', usuarios: 'Usuários' };
  const NOME_CAMPO = {
    id: 'ID', codigo: 'Código', nome: 'Nome', categoria_id: 'Categoria (ID)', fornecedor_id: 'Fornecedor (ID)',
    preco_compra: 'Preço de compra', preco_venda: 'Preço de venda', estoque_atual: 'Estoque atual', estoque_minimo: 'Estoque mínimo',
    status: 'Status', descricao: 'Descrição', criado_em: 'Criado em', email: 'E-mail', perfil_id: 'Perfil (ID)', ativo: 'Ativo',
    cnpj: 'CNPJ', telefone: 'Telefone'
  };

  function lerJson(texto) {
    if (!texto) return null;
    try { return JSON.parse(texto); } catch (e) { return null; }
  }
  function valorTexto(v) {
    if (v === null || v === undefined || v === '') return '—';
    if (v === true) return 'Sim';
    if (v === false) return 'Não';
    return String(v);
  }
  const rotuloCampo = k => NOME_CAMPO[k] || k;

  /** Monta o texto curto e a lista de detalhes de um registro de auditoria */
  function descreverAuditoria(r) {
    const antes = lerJson(r.dadosAntes);
    const depois = lerJson(r.dadosDepois);
    const base = depois || antes || {};
    const nome = base.nome || base.codigo || ('#' + (r.registroId ?? ''));

    if (r.operacao === 'INSERT') {
      return { texto: 'Criou "' + nome + '"', itens: Object.keys(depois || {}).map(k => [rotuloCampo(k), valorTexto(depois[k])]) };
    }
    if (r.operacao === 'DELETE') {
      return { texto: 'Excluiu "' + nome + '"', itens: Object.keys(antes || {}).map(k => [rotuloCampo(k), valorTexto(antes[k])]) };
    }
    const mudou = Object.keys(depois || {}).filter(k =>
      k !== 'criado_em' && JSON.stringify((antes || {})[k]) !== JSON.stringify(depois[k]));
    return {
      texto: 'Alterou "' + nome + '"' + (mudou.length ? ' (' + mudou.length + (mudou.length === 1 ? ' campo)' : ' campos)') : ''),
      itens: mudou.map(k => [rotuloCampo(k), valorTexto((antes || {})[k]) + ' → ' + valorTexto(depois[k])])
    };
  }

  async function carregarAuditoria() {
    const p = new URLSearchParams();
    if ($('a-tabela').value) p.set('tabela', $('a-tabela').value);
    p.set('limite', $('a-limite').value);
    try {
      const lista = await ERP.api('/api/auditoria?' + p.toString());
      $('resumo-auditoria').textContent = lista.length === 1 ? '1 registro' : lista.length + ' registros';
      const area = $('area-auditoria');
      if (lista.length === 0) { area.innerHTML = '<p class="vazio">Nenhum registro de auditoria.</p>'; return; }
      area.innerHTML = `
        <table>
          <caption class="so-leitor">Registro de auditoria</caption>
          <thead><tr>
            <th scope="col">Data</th><th scope="col">Tabela</th><th scope="col">Operação</th><th scope="col">Registro</th><th scope="col">O que mudou</th>
          </tr></thead>
          <tbody>${lista.map(r => {
            const d = descreverAuditoria(r);
            const detalhes = d.itens.length
              ? '<ul>' + d.itens.map(i => `<li><code>${ERP.esc(i[0])}</code>: ${ERP.esc(i[1])}</li>`).join('') + '</ul>'
              : '<p class="vazio">Sem detalhes.</p>';
            return `
              <tr>
                <td>${ERP.esc(ERP.dataHora(r.criadoEm))}</td>
                <td>${ERP.esc(NOME_TABELA[r.tabela] || r.tabela)}</td>
                <td><span class="selo ${ERP.esc(r.operacao)}">${ERP.esc(OPERACAO[r.operacao] || r.operacao)}</span></td>
                <td>${ERP.esc(r.registroId ?? '—')}</td>
                <td><details class="aud"><summary>${ERP.esc(d.texto)}</summary>${detalhes}</details></td>
              </tr>`;
          }).join('')}
          </tbody>
        </table>`;
    } catch (e) { avisoErro(e.message); }
  }

  $('form-auditoria').addEventListener('submit', ev => ev.preventDefault());
  $('a-tabela').addEventListener('change', carregarAuditoria);
  $('a-limite').addEventListener('change', carregarAuditoria);
  $('a-atualizar').addEventListener('click', carregarAuditoria);

  // ------------------------------------------------------------ abas
  const ABAS = ['usuarios', 'categorias', 'fornecedores', 'auditoria'];
  const CARREGAR = {
    usuarios: carregarUsuarios,
    categorias: () => categorias.carregar(),
    fornecedores: () => fornecedores.carregar(),
    auditoria: carregarAuditoria
  };

  function abrirAba(nome, focar) {
    ABAS.forEach(a => {
      const sel = a === nome;
      $('aba-' + a).setAttribute('aria-selected', sel ? 'true' : 'false');
      $('aba-' + a).tabIndex = sel ? 0 : -1;
      $('painel-' + a).hidden = !sel;
    });
    limparAvisos();
    if (focar) $('aba-' + nome).focus();
    CARREGAR[nome]();
  }

  ABAS.forEach((a, i) => {
    const botao = $('aba-' + a);
    botao.addEventListener('click', () => abrirAba(a, false));
    botao.addEventListener('keydown', ev => {
      let alvo = null;
      if (ev.key === 'ArrowRight') alvo = ABAS[(i + 1) % ABAS.length];
      else if (ev.key === 'ArrowLeft') alvo = ABAS[(i - 1 + ABAS.length) % ABAS.length];
      else if (ev.key === 'Home') alvo = ABAS[0];
      else if (ev.key === 'End') alvo = ABAS[ABAS.length - 1];
      if (alvo) { ev.preventDefault(); abrirAba(alvo, true); }
    });
  });

  // ------------------------------------------------------------ janelas: cancelar / excluir
  document.querySelectorAll('[data-fechar]').forEach(b =>
    b.addEventListener('click', () => $(b.dataset.fechar).close()));
  $('excluir-nao').addEventListener('click', () => { pendenteExclusao = null; $('dlg-excluir').close(); });
  $('excluir-sim').addEventListener('click', confirmarExclusao);

  // ------------------------------------------------------------ início
  abrirAba('usuarios', false);
})();
