using Dapper;
using Ferkautoparts.Api.Data;
using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Models;

namespace Ferkautoparts.Api.Repositories;

public interface IMovimentacaoRepository
{
    Task<IEnumerable<Movimentacao>> ListarAsync(int? produtoId, string? tipo, int limite);
    Task<int> RegistrarAsync(MovimentacaoRequest r, string tipo, int usuarioId);
}

public class MovimentacaoRepository : IMovimentacaoRepository
{
    private readonly IDbConnectionFactory _db;
    public MovimentacaoRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IEnumerable<Movimentacao>> ListarAsync(int? produtoId, string? tipo, int limite)
    {
        var where = new List<string>();
        var p = new DynamicParameters();
        p.Add("Limite", limite);

        if (produtoId.HasValue) { where.Add("m.produto_id = @ProdutoId"); p.Add("ProdutoId", produtoId.Value); }
        if (!string.IsNullOrWhiteSpace(tipo)) { where.Add("m.tipo = @Tipo"); p.Add("Tipo", tipo.Trim().ToUpper()); }

        var sql = @"select m.id, m.produto_id, p.codigo as produto_codigo, p.nome as produto_nome,
                           m.tipo, m.quantidade, m.estoque_anterior, m.estoque_final, m.motivo,
                           u.nome as usuario, m.criado_em
                      from movimentacoes_estoque m
                      join produtos p on p.id = m.produto_id
                      join usuarios u on u.id = m.usuario_id"
                + (where.Count > 0 ? " where " + string.Join(" and ", where) : "")
                + " order by m.criado_em desc, m.id desc limit @Limite";

        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<Movimentacao>(sql, p);
    }

    public async Task<int> RegistrarAsync(MovimentacaoRequest r, string tipo, int usuarioId)
    {
        await using var con = await _db.CriarAsync();
        // Toda a regra (estoque negativo, produto inativo) é aplicada pelo trigger do banco
        return await con.ExecuteScalarAsync<int>(
            "select sp_registrar_movimentacao(@ProdutoId, @UsuarioId, @Tipo, @Quantidade, @Motivo)",
            new { r.ProdutoId, UsuarioId = usuarioId, Tipo = tipo, r.Quantidade, r.Motivo });
    }
}
