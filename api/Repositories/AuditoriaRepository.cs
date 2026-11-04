using Dapper;
using Ferkautoparts.Api.Data;
using Ferkautoparts.Api.Models;

namespace Ferkautoparts.Api.Repositories;

public interface IAuditoriaRepository
{
    Task<IEnumerable<RegistroAuditoria>> ListarAsync(string? tabela, int limite);
}

public class AuditoriaRepository : IAuditoriaRepository
{
    private readonly IDbConnectionFactory _db;
    public AuditoriaRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IEnumerable<RegistroAuditoria>> ListarAsync(string? tabela, int limite)
    {
        var p = new DynamicParameters();
        p.Add("Limite", limite);
        var where = "";
        if (!string.IsNullOrWhiteSpace(tabela))
        {
            where = " where tabela = @Tabela";
            p.Add("Tabela", tabela.Trim().ToLower());
        }

        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<RegistroAuditoria>(
            @"select id, tabela, operacao, registro_id,
                     dados_antes::text as dados_antes, dados_depois::text as dados_depois, criado_em
                from auditoria" + where + " order by id desc limit @Limite", p);
    }
}
