using Dapper;
using Ferkautoparts.Api.Data;
using Ferkautoparts.Api.Models;

namespace Ferkautoparts.Api.Repositories;

public interface IRelatorioRepository
{
    Task<Dashboard> ObterDashboardAsync();
    Task<IEnumerable<ResumoCategoria>> PorCategoriaAsync();
    Task<IEnumerable<SugestaoCompra>> SugestaoCompraAsync(int estoqueIdeal);
}

public class RelatorioRepository : IRelatorioRepository
{
    private readonly IDbConnectionFactory _db;
    public RelatorioRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IEnumerable<ResumoCategoria>> PorCategoriaAsync()
    {
        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<ResumoCategoria>("select * from fn_relatorio_estoque()");
    }

    public async Task<IEnumerable<SugestaoCompra>> SugestaoCompraAsync(int estoqueIdeal)
    {
        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<SugestaoCompra>(
            "select * from fn_sugestao_compra(@estoqueIdeal)", new { estoqueIdeal });
    }

    public async Task<Dashboard> ObterDashboardAsync()
    {
        await using var con = await _db.CriarAsync();
        using var m = await con.QueryMultipleAsync(@"
            select count(*)::bigint from produtos where status = 'ATIVO';
            select coalesce(sum(estoque_atual), 0)::bigint from produtos;
            select coalesce(sum(estoque_atual * preco_compra), 0)::numeric from produtos;
            select * from vw_estoque_status
             where status = 'ATIVO' and (status_estoque = 'CRITICO' or abaixo_minimo)
             order by estoque_atual, nome;
            select * from fn_relatorio_estoque();
            select to_char(criado_em::date, 'YYYY-MM-DD') as dia, tipo, sum(quantidade)::bigint as total
              from movimentacoes_estoque
             where criado_em >= now() - interval '7 days'
             group by 1, 2 order by 1;");

        var d = new Dashboard
        {
            ProdutosAtivos = await m.ReadSingleAsync<long>(),
            UnidadesEmEstoque = await m.ReadSingleAsync<long>(),
            ValorEstoque = await m.ReadSingleAsync<decimal>()
        };
        d.Criticos = (await m.ReadAsync<Produto>()).ToList();
        d.TotalCriticos = d.Criticos.Count;
        d.PorCategoria = (await m.ReadAsync<ResumoCategoria>()).ToList();
        d.MovimentosUltimos7Dias = (await m.ReadAsync<MovimentoDia>()).ToList();
        return d;
    }
}
