using Dapper;
using Ferkautoparts.Api.Data;
using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Models;

namespace Ferkautoparts.Api.Repositories;

public interface IProdutoRepository
{
    Task<IEnumerable<Produto>> ListarAsync(string? busca, string? status, string? statusEstoque, int? categoriaId);
    Task<Produto?> ObterAsync(int id);
    Task<int> InserirAsync(ProdutoRequest r);
    Task<bool> AtualizarAsync(int id, ProdutoRequest r);
    Task<bool> ExcluirAsync(int id);
}

public class ProdutoRepository : IProdutoRepository
{
    private readonly IDbConnectionFactory _db;
    public ProdutoRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IEnumerable<Produto>> ListarAsync(string? busca, string? status, string? statusEstoque, int? categoriaId)
    {
        var where = new List<string>();
        var p = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(busca))
        {
            where.Add("(nome ilike @Busca or codigo ilike @Busca)");
            p.Add("Busca", $"%{busca.Trim()}%");
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            where.Add("status = @Status");
            p.Add("Status", status.Trim().ToUpper());
        }
        if (!string.IsNullOrWhiteSpace(statusEstoque))
        {
            where.Add("status_estoque = @StatusEstoque");
            p.Add("StatusEstoque", statusEstoque.Trim().ToUpper());
        }
        if (categoriaId.HasValue)
        {
            where.Add("categoria_id = @CategoriaId");
            p.Add("CategoriaId", categoriaId.Value);
        }

        var sql = "select * from vw_estoque_status"
                + (where.Count > 0 ? " where " + string.Join(" and ", where) : "")
                + " order by nome";

        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<Produto>(sql, p);
    }

    public async Task<Produto?> ObterAsync(int id)
    {
        await using var con = await _db.CriarAsync();
        return await con.QueryFirstOrDefaultAsync<Produto>(
            "select * from vw_estoque_status where id = @id", new { id });
    }

    public async Task<int> InserirAsync(ProdutoRequest r)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteScalarAsync<int>(
            @"insert into produtos
                (codigo, nome, categoria_id, fornecedor_id, preco_compra, preco_venda,
                 estoque_atual, estoque_minimo, status, descricao)
              values
                (@Codigo, @Nome, @CategoriaId, @FornecedorId, @PrecoCompra, @PrecoVenda,
                 @EstoqueAtual, @EstoqueMinimo, @Status, @Descricao)
              returning id",
            new
            {
                Codigo = r.Codigo!.Trim(),
                Nome = r.Nome!.Trim(),
                r.CategoriaId,
                r.FornecedorId,
                r.PrecoCompra,
                r.PrecoVenda,
                EstoqueAtual = r.EstoqueAtual ?? 0,
                r.EstoqueMinimo,
                Status = (r.Status ?? "ATIVO").ToUpper(),
                r.Descricao
            });
    }

    public async Task<bool> AtualizarAsync(int id, ProdutoRequest r)
    {
        await using var con = await _db.CriarAsync();
        // estoque_atual NÃO é alterado aqui: só muda por movimentação (regra do trigger)
        var n = await con.ExecuteAsync(
            @"update produtos set
                codigo = @Codigo, nome = @Nome, categoria_id = @CategoriaId, fornecedor_id = @FornecedorId,
                preco_compra = @PrecoCompra, preco_venda = @PrecoVenda, estoque_minimo = @EstoqueMinimo,
                status = @Status, descricao = @Descricao
              where id = @Id",
            new
            {
                Id = id,
                Codigo = r.Codigo!.Trim(),
                Nome = r.Nome!.Trim(),
                r.CategoriaId,
                r.FornecedorId,
                r.PrecoCompra,
                r.PrecoVenda,
                r.EstoqueMinimo,
                Status = (r.Status ?? "ATIVO").ToUpper(),
                r.Descricao
            });
        return n > 0;
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteAsync("delete from produtos where id = @id", new { id }) > 0;
    }
}
