-- =====================================================================
-- ERP Ferkautoparts - PIM IV  |  Script completo do banco (PostgreSQL / Supabase)
-- Como rodar: Supabase > SQL Editor > New query > colar tudo > Run
-- O script apaga e recria tudo, entao pode ser executado mais de uma vez.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. LIMPEZA
-- ---------------------------------------------------------------------
drop view     if exists vw_produtos_criticos cascade;
drop view     if exists vw_estoque_status    cascade;
drop table    if exists auditoria             cascade;
drop table    if exists movimentacoes_estoque cascade;
drop table    if exists produtos              cascade;
drop table    if exists fornecedores          cascade;
drop table    if exists categorias            cascade;
drop table    if exists usuarios              cascade;
drop table    if exists perfis                cascade;
drop function if exists sp_registrar_movimentacao(int, int, text, int, text);
drop function if exists fn_relatorio_estoque();
drop function if exists fn_sugestao_compra(int);
drop function if exists fn_auditar_produtos();
drop function if exists fn_auditar();
drop function if exists fn_processar_movimentacao();
drop function if exists fn_proteger_estoque();

-- ---------------------------------------------------------------------
-- 1. TABELAS (modelo fisico)
-- ---------------------------------------------------------------------
create table perfis (
    id    serial primary key,
    nome  varchar(30) not null unique
);

create table usuarios (
    id          serial primary key,
    nome        varchar(100) not null,
    email       varchar(150) not null unique,
    senha_hash  text not null,                       -- hash bcrypt, nunca senha pura
    perfil_id   int not null references perfis(id),
    ativo       boolean not null default true,
    criado_em   timestamptz not null default now()
);

create table categorias (
    id         serial primary key,
    nome       varchar(60) not null unique,
    descricao  varchar(200)
);

create table fornecedores (
    id        serial primary key,
    nome      varchar(100) not null unique,
    cnpj      varchar(18),
    telefone  varchar(20),
    email     varchar(150)
);

create table produtos (
    id             serial primary key,
    codigo         varchar(30)  not null unique,     -- SKU
    nome           varchar(150) not null,
    categoria_id   int not null references categorias(id),
    fornecedor_id  int references fornecedores(id),
    preco_compra   numeric(12,2) not null check (preco_compra >= 0),
    preco_venda    numeric(12,2) not null check (preco_venda  >= 0),
    estoque_atual  int not null default 0 check (estoque_atual  >= 0),
    estoque_minimo int not null default 0 check (estoque_minimo >= 0),
    status         varchar(20) not null default 'ATIVO'
                   check (status in ('ATIVO','INATIVO','OBSOLETO')),
    descricao      varchar(300),
    criado_em      timestamptz not null default now()
);

create table movimentacoes_estoque (
    id               serial primary key,
    produto_id       int not null references produtos(id),
    usuario_id       int not null references usuarios(id),
    tipo             varchar(10) not null check (tipo in ('ENTRADA','SAIDA')),
    quantidade       int not null check (quantidade > 0),
    estoque_anterior int not null,
    estoque_final    int not null,
    motivo           varchar(200),
    criado_em        timestamptz not null default now()
);

create table auditoria (
    id            bigserial primary key,
    tabela        varchar(50) not null,
    operacao      varchar(10) not null,
    registro_id   int,
    dados_antes   jsonb,
    dados_depois  jsonb,
    criado_em     timestamptz not null default now()
);

create index ix_produtos_categoria on produtos(categoria_id);
create index ix_mov_produto        on movimentacoes_estoque(produto_id);
create index ix_mov_data           on movimentacoes_estoque(criado_em);
create index ix_auditoria_tabela   on auditoria(tabela, criado_em desc);

-- ---------------------------------------------------------------------
-- 2. TRIGGERS
-- ---------------------------------------------------------------------

-- 2.1 Processa toda movimentacao: valida, calcula saldo e atualiza o produto.
--     A regra mora no banco, entao nao ha como burlar pela API.
create function fn_processar_movimentacao() returns trigger
language plpgsql as $$
declare
    v_atual  int;
    v_status text;
begin
    select estoque_atual, status into v_atual, v_status
      from produtos where id = new.produto_id for update;

    if not found then
        raise exception 'Produto % nao encontrado', new.produto_id;
    end if;
    if v_status <> 'ATIVO' then
        raise exception 'Produto % esta % e nao pode ser movimentado', new.produto_id, v_status;
    end if;
    if new.tipo = 'SAIDA' and new.quantidade > v_atual then
        raise exception 'Estoque insuficiente (disponivel: %, pedido: %)', v_atual, new.quantidade;
    end if;

    new.estoque_anterior := v_atual;
    new.estoque_final    := case when new.tipo = 'ENTRADA'
                                 then v_atual + new.quantidade
                                 else v_atual - new.quantidade end;

    perform set_config('erp.movimentacao', 'on', true);
    update produtos set estoque_atual = new.estoque_final where id = new.produto_id;
    perform set_config('erp.movimentacao', 'off', true);

    return new;
end;
$$;

create trigger trg_processar_movimentacao
before insert on movimentacoes_estoque
for each row execute function fn_processar_movimentacao();

-- 2.2 Impede alterar estoque_atual fora de uma movimentacao.
create function fn_proteger_estoque() returns trigger
language plpgsql as $$
begin
    if new.estoque_atual is distinct from old.estoque_atual
       and coalesce(current_setting('erp.movimentacao', true), '') <> 'on' then
        raise exception 'O estoque so pode ser alterado por movimentacao (entrada/saida)';
    end if;
    return new;
end;
$$;

create trigger trg_proteger_estoque
before update of estoque_atual on produtos
for each row execute function fn_proteger_estoque();

-- 2.3 Auditoria (quem mexeu em que): produtos, categorias, fornecedores e usuarios.
create function fn_auditar() returns trigger
language plpgsql as $$
declare
    v_antes  jsonb;
    v_depois jsonb;
begin
    if tg_op in ('UPDATE', 'DELETE') then v_antes  := to_jsonb(old) - 'senha_hash'; end if;
    if tg_op in ('INSERT', 'UPDATE') then v_depois := to_jsonb(new) - 'senha_hash'; end if;

    insert into auditoria (tabela, operacao, registro_id, dados_antes, dados_depois)
    values (tg_table_name, tg_op,
            (coalesce(v_depois, v_antes) ->> 'id')::int,
            v_antes, v_depois);
    return null;
end;
$$;

create trigger trg_auditar_produtos     after insert or update or delete on produtos     for each row execute function fn_auditar();
create trigger trg_auditar_categorias   after insert or update or delete on categorias   for each row execute function fn_auditar();
create trigger trg_auditar_fornecedores after insert or update or delete on fornecedores for each row execute function fn_auditar();
create trigger trg_auditar_usuarios     after insert or update or delete on usuarios     for each row execute function fn_auditar();

-- ---------------------------------------------------------------------
-- 3. VIEW: situacao do estoque (mesma regra do PIM III)
--    CRITICO < 10 | BAIXO 10-29 | NORMAL >= 30 ; abaixo_minimo compara com o minimo do produto
-- ---------------------------------------------------------------------
create view vw_estoque_status as
select p.id, p.codigo, p.nome,
       p.categoria_id, c.nome as categoria,
       p.fornecedor_id, f.nome as fornecedor,
       p.preco_compra, p.preco_venda,
       p.estoque_atual, p.estoque_minimo,
       p.status, p.descricao,
       case when p.estoque_atual < 10 then 'CRITICO'
            when p.estoque_atual < 30 then 'BAIXO'
            else 'NORMAL' end                    as status_estoque,
       (p.estoque_atual < p.estoque_minimo)       as abaixo_minimo
  from produtos p
  join categorias c on c.id = p.categoria_id
  left join fornecedores f on f.id = p.fornecedor_id;

-- ---------------------------------------------------------------------
-- 4. PROCEDURES / FUNCTIONS
-- ---------------------------------------------------------------------

-- 4.1 Registrar movimentacao (a validacao e o saldo ficam no trigger)
create function sp_registrar_movimentacao(
    p_produto_id int,
    p_usuario_id int,
    p_tipo       text,
    p_quantidade int,
    p_motivo     text default null
) returns int
language plpgsql as $$
declare
    v_id int;
begin
    if p_tipo not in ('ENTRADA', 'SAIDA') then
        raise exception 'Tipo invalido: % (use ENTRADA ou SAIDA)', p_tipo;
    end if;
    if p_quantidade is null or p_quantidade <= 0 then
        raise exception 'Quantidade deve ser maior que zero';
    end if;

    insert into movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, motivo)
    values (p_produto_id, p_usuario_id, p_tipo, p_quantidade, p_motivo)
    returning id into v_id;

    return v_id;
end;
$$;

-- 4.2 Relatorio de estoque por categoria
create function fn_relatorio_estoque()
returns table (categoria text, produtos bigint, unidades bigint, valor_estoque numeric, criticos bigint)
language sql stable as $$
    select c.nome::text,
           count(p.id)::bigint,
           coalesce(sum(p.estoque_atual), 0)::bigint,
           coalesce(sum(p.estoque_atual * p.preco_compra), 0)::numeric,
           count(p.id) filter (where p.estoque_atual < 10)::bigint
      from categorias c
      left join produtos p on p.categoria_id = c.id and p.status = 'ATIVO'
     group by c.nome
     order by c.nome;
$$;

-- 4.3 Sugestao de compra (estoque ideal padrao = 50, igual ao PIM III)
create function fn_sugestao_compra(p_ideal int default 50)
returns table (produto_id int, codigo text, nome text, categoria text, fornecedor text,
               estoque_atual int, estoque_ideal int, qtd_comprar int, custo_estimado numeric)
language sql stable as $$
    select p.id, p.codigo::text, p.nome::text, c.nome::text, coalesce(f.nome, '-')::text,
           p.estoque_atual, p_ideal, (p_ideal - p.estoque_atual),
           ((p_ideal - p.estoque_atual) * p.preco_compra)::numeric
      from produtos p
      join categorias c on c.id = p.categoria_id
      left join fornecedores f on f.id = p.fornecedor_id
     where p.status = 'ATIVO' and p.estoque_atual < p_ideal
     order by (p_ideal - p.estoque_atual) desc, p.nome;
$$;

-- ---------------------------------------------------------------------
-- 5. DADOS INICIAIS
-- ---------------------------------------------------------------------
insert into perfis (nome) values ('ADMIN'), ('OPERADOR');

-- Senhas de teste (troque depois): Admin@123 e Oper@123 -> gravadas como hash bcrypt
insert into usuarios (nome, email, senha_hash, perfil_id) values
 ('Administrador', 'admin@ferkautoparts.com',
    crypt('Admin@123', gen_salt('bf')), (select id from perfis where nome = 'ADMIN')),
 ('Operador',      'operador@ferkautoparts.com',
    crypt('Oper@123',  gen_salt('bf')), (select id from perfis where nome = 'OPERADOR'));

insert into categorias (nome, descricao) values
    ('Freios', 'Pastilhas, discos e fluido de freio'),
    ('Filtros', 'Filtros de ar, óleo e combustível'),
    ('Suspensão', 'Amortecedores, pivôs e braços'),
    ('Motor', 'Peças e consumíveis do motor'),
    ('Elétrica', 'Ignição, sensores, bateria e partida'),
    ('Arrefecimento', 'Radiador, ventoinha e aditivos'),
    ('Direção', 'Rolamentos e terminais'),
    ('Acessórios', 'Itens de acabamento e uso geral');

-- Fornecedores ficticios (para fins academicos)
insert into fornecedores (nome, telefone, email) values
    ('AutoPeças Brasil', '(11) 3000-1000', 'vendas@autopecasbrasil.com'),
    ('Mecânica Total', '(11) 3000-2000', 'contato@mecanicatotal.com'),
    ('Distribuidora Sul', '(51) 3000-3000', 'comercial@distsul.com'),
    ('Elétrica Paulista', '(11) 3000-4000', 'pedidos@eletricapaulista.com');

-- 30 produtos do PIM III (preco_compra = 60% do preco de venda, valor estimado)
insert into produtos
    (codigo, nome, categoria_id, fornecedor_id, preco_compra, preco_venda, estoque_atual, estoque_minimo)
select v.codigo, v.nome, c.id, f.id, v.pc, v.pv, v.ea, v.em
from (values
    ('100001', 'Pastilha de Freio Dianteira', 'Freios', 'AutoPeças Brasil', 53.94, 89.90, 120, 30),
    ('100002', 'Disco de Freio Ventilado', 'Freios', 'AutoPeças Brasil', 131.94, 219.90, 45, 20),
    ('100003', 'Filtro de Ar do Motor', 'Filtros', 'Mecânica Total', 23.94, 39.90, 80, 40),
    ('100004', 'Filtro de Óleo', 'Filtros', 'Mecânica Total', 17.94, 29.90, 150, 50),
    ('100005', 'Filtro de Combustível', 'Filtros', 'Mecânica Total', 20.94, 34.90, 95, 30),
    ('100006', 'Amortecedor Dianteiro', 'Suspensão', 'Distribuidora Sul', 173.40, 289.00, 20, 15),
    ('100007', 'Amortecedor Traseiro', 'Suspensão', 'Distribuidora Sul', 167.40, 279.00, 18, 15),
    ('100008', 'Kit Embreagem Completo', 'Motor', 'Mecânica Total', 497.94, 829.90, 10, 10),
    ('100009', 'Correia Dentada', 'Motor', 'Mecânica Total', 40.74, 67.90, 140, 30),
    ('100010', 'Correia do Alternador', 'Motor', 'Mecânica Total', 27.00, 45.00, 110, 30),
    ('100011', 'Jogo de Velas', 'Elétrica', 'Elétrica Paulista', 59.94, 99.90, 90, 20),
    ('100012', 'Bobina de Ignição', 'Elétrica', 'Elétrica Paulista', 113.94, 189.90, 35, 15),
    ('100013', 'Bateria Automotiva 60Ah', 'Elétrica', 'Elétrica Paulista', 299.40, 499.00, 25, 10),
    ('100014', 'Bomba de Combustível', 'Motor', 'Mecânica Total', 218.40, 364.00, 30, 15),
    ('100015', 'Radiador', 'Arrefecimento', 'Distribuidora Sul', 353.94, 589.90, 12, 10),
    ('100016', 'Ventoinha do Radiador', 'Arrefecimento', 'Distribuidora Sul', 149.94, 249.90, 22, 10),
    ('100017', 'Sensor de Oxigênio', 'Elétrica', 'Elétrica Paulista', 107.94, 179.90, 40, 15),
    ('100018', 'Sensor MAP', 'Elétrica', 'Elétrica Paulista', 95.94, 159.90, 28, 15),
    ('100019', 'Alternador 120A', 'Elétrica', 'Elétrica Paulista', 630.00, 1050.00, 8, 5),
    ('100020', 'Motor de Partida', 'Elétrica', 'Elétrica Paulista', 539.40, 899.00, 9, 5),
    ('100021', 'Rolamento de Roda', 'Direção', 'AutoPeças Brasil', 47.94, 79.90, 70, 20),
    ('100022', 'Terminal de Direção', 'Direção', 'AutoPeças Brasil', 41.94, 69.90, 55, 20),
    ('100023', 'Pivô de Suspensão', 'Suspensão', 'Distribuidora Sul', 44.94, 74.90, 48, 15),
    ('100024', 'Braço de Suspensão', 'Suspensão', 'Distribuidora Sul', 197.94, 329.90, 15, 10),
    ('100025', 'Kit Correia + Tensor', 'Motor', 'Mecânica Total', 149.94, 249.90, 20, 10),
    ('100026', 'Óleo de Motor 5W30 (1L)', 'Motor', 'Mecânica Total', 29.94, 49.90, 200, 50),
    ('100027', 'Fluido de Freio DOT4', 'Freios', 'AutoPeças Brasil', 14.94, 24.90, 160, 40),
    ('100028', 'Aditivo de Radiador', 'Arrefecimento', 'Distribuidora Sul', 11.94, 19.90, 130, 30),
    ('100029', 'Limpador de Para-brisa', 'Acessórios', 'AutoPeças Brasil', 13.74, 22.90, 100, 30),
    ('100030', 'Cabo de Vela', 'Elétrica', 'Elétrica Paulista', 35.94, 59.90, 60, 20)
) as v(codigo, nome, cat, forn, pc, pv, ea, em)
join categorias   c on c.nome = v.cat
join fornecedores f on f.nome = v.forn;

-- Historico inicial de movimentacoes (o trigger calcula o saldo)
insert into movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, motivo, criado_em)
select p.id, u.id, m.tipo, m.qtd, m.motivo, now() - (m.dias || ' days')::interval
from (values
    ('100001', 'ENTRADA',  50, 'Reposição inicial',        6),
    ('100019', 'SAIDA',     2, 'Venda para cliente João',  5),
    ('100020', 'SAIDA',     1, 'Troca em garantia',        4),
    ('100004', 'ENTRADA', 100, 'Compra de fornecedor',     4),
    ('100011', 'SAIDA',    10, 'Venda para oficina parceira', 2),
    ('100008', 'ENTRADA',   5, 'Reposição',                2),
    ('100009', 'SAIDA',     3, 'Venda balcão',             1)
) as m(codigo, tipo, qtd, motivo, dias)
join produtos p on p.codigo = m.codigo
cross join (select id from usuarios where email = 'admin@ferkautoparts.com') u
order by m.dias desc;

-- ---------------------------------------------------------------------
-- 6. SEGURANCA (RLS)
-- O Supabase expoe tabelas via API publica. Com RLS ligado e sem policy,
-- ninguem acessa direto: so a nossa API (conexao Postgres) acessa.
-- ---------------------------------------------------------------------
alter table perfis                enable row level security;
alter table usuarios              enable row level security;
alter table categorias            enable row level security;
alter table fornecedores          enable row level security;
alter table produtos              enable row level security;
alter table movimentacoes_estoque enable row level security;
alter table auditoria             enable row level security;

-- ---------------------------------------------------------------------
-- 7. TESTES RAPIDOS (rode depois, um por vez)
-- ---------------------------------------------------------------------
-- select count(*) from produtos;                                 -- 30
-- select * from vw_estoque_status where status_estoque = 'CRITICO';
-- select * from fn_sugestao_compra();
-- select * from fn_relatorio_estoque();
-- select sp_registrar_movimentacao(1, 1, 'SAIDA', 5, 'teste');
-- select sp_registrar_movimentacao(1, 1, 'SAIDA', 99999, 'deve falhar');
-- update produtos set estoque_atual = 999 where id = 1;          -- deve falhar
-- select * from auditoria order by id desc limit 5;
