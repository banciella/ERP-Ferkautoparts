/* Tela de Produtos: lista com filtros; o ADMIN cadastra, edita e exclui. */
(function () {
  'use strict';

  const usuario = ERP.montarPagina({ id: 'produtos' });
  if (!usuario) return;

  const ehAdmin = usuario.perfil === 'ADMIN';
  const $ = id => document.getElementById(id);
  const ROTULO_SITUACAO = { CRITICO: 'Crítico', BAIXO: 'Baixo', NORMAL: 'Normal' };
  const ROTULO_STATUS = { ATIVO: 'Ativo', INATIVO: 'Inativo', OBSOLETO: 'Obsoleto' };

  let produtos = [];
  let categorias = [];
  let fornecedores = [];
  let editandoId = null;   // null = cadastrando
  let excluindo = null;    // produto selecionado para exclusão
  let temporizador = null;

  // ------------------------------------------------------------ avisos
  function avisoOk(texto) {
    $('aviso-erro').hidden = true;
    $('aviso-ok').textContent = texto;
    $('aviso-ok').hidden = false;
  }
  function avisoErro(texto) {
    $('aviso-ok').hidden = true;
    $('aviso-erro').textContent = texto;
    $('aviso-erro').hidden = false;
  }
  function limparAvisos() { $('aviso-ok').hidden = true; $('aviso-erro').hidden = true; }

  // ------------------------------------------------------------ lista
  function filtrosAtuais() {
    const p = new URLSearchParams();
    const busca = $('f-busca').value.trim();
    if (busca) p.set('busca', busca);
    if ($('f-categoria').value) p.set('categoriaId', $('f-categoria').value);
    if ($('f-situacao').value) p.set('statusEstoque', $('f-situacao').value);
    if ($('f-status').value) p.set('status', $('f-status').value);
    const q = p.toString();
    return q ? '?' + q : '';
  }

  function desenharTabela() {
    const area = $('tabela-area');
    const temFiltro = filtrosAtuais() !== '';
    $('resumo').textContent = produtos.length === 1 ? '1 produto encontrado' : produtos.length + ' produtos encontrados';

    if (produtos.length === 0) {
      area.innerHTML = '<p class="vazio">' + (temFiltro
        ? 'Nenhum produto com esses filtros. Tente limpar os filtros.'
        : 'Nenhum produto cadastrado ainda.') + '</p>';
      return;
    }

    const linhas = produtos.map(p => {
      const acoes = ehAdmin
        ? `<button type="button" class="btn btn-claro btn-peq" data-acao="editar" data-id="${p.id}" aria-label="Editar ${ERP.esc(p.nome)}">Editar</button>
           <button type="button" class="btn btn-perigo btn-peq" data-acao="excluir" data-id="${p.id}" aria-label="Excluir ${ERP.esc(p.nome)}">Excluir</button>`
        : '';
      const mover = p.status === 'ATIVO'
        ? `<a class="btn btn-claro btn-peq" href="movimentacoes.html?produto=${p.id}" aria-label="Movimentar ${ERP.esc(p.nome)}">Movimentar</a>`
        : '';
      return `
        <tr>
          <td>${ERP.esc(p.codigo)}</td>
          <td>${ERP.esc(p.nome)}</td>
          <td>${ERP.esc(p.categoria)}</td>
          <td class="num">${ERP.moeda(p.precoVenda)}</td>
          <td class="num">${ERP.inteiro(p.estoqueAtual)}</td>
          <td class="num">${ERP.inteiro(p.estoqueMinimo)}</td>
          <td><span class="selo ${ERP.esc(p.statusEstoque)}">${ERP.esc(ROTULO_SITUACAO[p.statusEstoque] || p.statusEstoque)}</span></td>
          <td><span class="selo ${ERP.esc(p.status)}">${ERP.esc(ROTULO_STATUS[p.status] || p.status)}</span></td>
          <td><div class="acoes">${mover}${acoes}</div></td>
        </tr>`;
    }).join('');

    area.innerHTML = `
      <table>
        <caption class="so-leitor">Lista de produtos</caption>
        <thead><tr>
          <th scope="col">Código</th><th scope="col">Produto</th><th scope="col">Categoria</th>
          <th scope="col" class="num">Preço venda</th><th scope="col" class="num">Estoque</th><th scope="col" class="num">Mínimo</th>
          <th scope="col">Situação</th><th scope="col">Status</th><th scope="col">Ações</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>`;
  }

  async function carregarLista() {
    try {
      produtos = await ERP.api('/api/produtos' + filtrosAtuais());
      desenharTabela();
    } catch (e) {
      avisoErro(e.message);
      $('resumo').textContent = '';
    }
  }

  // ------------------------------------------------------------ selects
  function opcoesSelect(lista, vazio) {
    return (vazio ? `<option value="">${vazio}</option>` : '') +
      lista.map(i => `<option value="${i.id}">${ERP.esc(i.nome)}</option>`).join('');
  }

  async function carregarApoio() {
    [categorias, fornecedores] = await Promise.all([
      ERP.api('/api/categorias'),
      ERP.api('/api/fornecedores')
    ]);
    $('f-categoria').innerHTML = opcoesSelect(categorias, 'Todas');
    $('p-categoria').innerHTML = opcoesSelect(categorias, 'Selecione...');
    $('p-fornecedor').innerHTML = opcoesSelect(fornecedores, '— nenhum —');
  }

  // ------------------------------------------------------------ cadastrar / editar
  function abrirFormulario(produto) {
    editandoId = produto ? produto.id : null;
    $('dlg-erro').hidden = true;
    $('dlg-titulo').textContent = produto ? 'Editar produto' : 'Novo produto';

    $('p-codigo').value = produto ? produto.codigo : '';
    $('p-nome').value = produto ? produto.nome : '';
    $('p-categoria').value = produto ? String(produto.categoriaId) : '';
    $('p-fornecedor').value = produto && produto.fornecedorId ? String(produto.fornecedorId) : '';
    $('p-compra').value = produto ? produto.precoCompra : 0;
    $('p-venda').value = produto ? produto.precoVenda : 0;
    $('p-estoque').value = produto ? produto.estoqueAtual : 0;
    $('p-minimo').value = produto ? produto.estoqueMinimo : 0;
    $('p-status').value = produto ? produto.status : 'ATIVO';
    $('p-descricao').value = produto && produto.descricao ? produto.descricao : '';

    // No cadastro o estoque inicial é livre. Na edição só muda por movimentação (regra do banco).
    $('p-estoque').disabled = !!produto;
    $('dica-estoque').textContent = produto
      ? 'Para alterar o estoque, registre uma entrada ou saída em Movimentações.'
      : 'Estoque inicial do produto.';

    $('dlg-produto').showModal();
    $('p-codigo').focus();
  }

  function lerFormulario() {
    const num = id => Number($('' + id).value.replace(',', '.'));
    return {
      codigo: $('p-codigo').value.trim(),
      nome: $('p-nome').value.trim(),
      categoriaId: Number($('p-categoria').value) || 0,
      fornecedorId: $('p-fornecedor').value ? Number($('p-fornecedor').value) : null,
      precoCompra: num('p-compra'),
      precoVenda: num('p-venda'),
      estoqueAtual: num('p-estoque'),
      estoqueMinimo: num('p-minimo'),
      status: $('p-status').value,
      descricao: $('p-descricao').value.trim() || null
    };
  }

  function validar(d) {
    if (!d.codigo) return 'Informe o código (SKU).';
    if (!d.nome) return 'Informe o nome.';
    if (!d.categoriaId) return 'Escolha a categoria.';
    if (isNaN(d.precoCompra) || d.precoCompra < 0) return 'O preço de compra não pode ser negativo.';
    if (isNaN(d.precoVenda) || d.precoVenda < 0) return 'O preço de venda não pode ser negativo.';
    if (isNaN(d.estoqueMinimo) || d.estoqueMinimo < 0 || !Number.isInteger(d.estoqueMinimo)) return 'O estoque mínimo deve ser um número inteiro, zero ou maior.';
    if (editandoId === null && (isNaN(d.estoqueAtual) || d.estoqueAtual < 0 || !Number.isInteger(d.estoqueAtual))) return 'O estoque inicial deve ser um número inteiro, zero ou maior.';
    return null;
  }

  async function salvar(ev) {
    ev.preventDefault();
    const dados = lerFormulario();
    const erro = validar(dados);
    const caixa = $('dlg-erro');
    if (erro) { caixa.textContent = erro; caixa.hidden = false; return; }
    caixa.hidden = true;

    const botao = $('btn-salvar');
    botao.disabled = true;
    botao.textContent = 'Salvando...';
    try {
      if (editandoId === null) {
        await ERP.api('/api/produtos', { method: 'POST', body: dados });
        avisoOk('Produto "' + dados.nome + '" cadastrado com sucesso.');
      } else {
        await ERP.api('/api/produtos/' + editandoId, { method: 'PUT', body: dados });
        avisoOk('Produto "' + dados.nome + '" atualizado com sucesso.');
      }
      $('dlg-produto').close();
      await carregarLista();
    } catch (e) {
      caixa.textContent = e.message;
      caixa.hidden = false;
    } finally {
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  }

  // ------------------------------------------------------------ excluir
  function pedirExclusao(produto) {
    excluindo = produto;
    $('excluir-texto').textContent = 'Você vai excluir "' + produto.nome + '" (código ' + produto.codigo + '). Essa ação não pode ser desfeita.';
    $('dlg-excluir').showModal();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;
    const botao = $('btn-excluir-sim');
    botao.disabled = true;
    try {
      await ERP.api('/api/produtos/' + alvo.id, { method: 'DELETE' });
      $('dlg-excluir').close();
      avisoOk('Produto "' + alvo.nome + '" excluído.');
      await carregarLista();
    } catch (e) {
      $('dlg-excluir').close();
      avisoErro(e.message);
    } finally {
      botao.disabled = false;
      excluindo = null;
    }
  }

  // ------------------------------------------------------------ eventos
  $('form-filtros').addEventListener('submit', ev => ev.preventDefault());
  $('f-busca').addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(carregarLista, 300);
  });
  ['f-categoria', 'f-situacao', 'f-status'].forEach(id => $(id).addEventListener('change', carregarLista));
  $('btn-limpar').addEventListener('click', () => {
    $('form-filtros').reset();
    limparAvisos();
    carregarLista();
  });

  $('tabela-area').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-acao]');
    if (!b) return;
    const p = produtos.find(x => x.id === Number(b.dataset.id));
    if (!p) return;
    limparAvisos();
    if (b.dataset.acao === 'editar') abrirFormulario(p);
    if (b.dataset.acao === 'excluir') pedirExclusao(p);
  });

  $('btn-novo').addEventListener('click', () => { limparAvisos(); abrirFormulario(null); });
  $('form-produto').addEventListener('submit', salvar);
  $('btn-cancelar').addEventListener('click', () => $('dlg-produto').close());
  $('btn-excluir-nao').addEventListener('click', () => { excluindo = null; $('dlg-excluir').close(); });
  $('btn-excluir-sim').addEventListener('click', confirmarExclusao);

  // ------------------------------------------------------------ início
  if (ehAdmin) {
    $('btn-novo').hidden = false;
  } else {
    $('sub-pagina').textContent = 'Catálogo de peças e situação do estoque · somente consulta (cadastro é feito pelo ADMIN)';
  }

  (async function iniciar() {
    try {
      await carregarApoio();
    } catch (e) {
      avisoErro(e.message);
    }
    await carregarLista();
  })();
})();
