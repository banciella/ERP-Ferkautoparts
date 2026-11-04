using Dapper;
using Ferkautoparts.Api.Data;
using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Models;

namespace Ferkautoparts.Api.Repositories;

public interface IFornecedorRepository
{
    Task<IEnumerable<Fornecedor>> ListarAsync();
    Task<int> InserirAsync(FornecedorRequest r);
    Task<bool> AtualizarAsync(int id, FornecedorRequest r);
    Task<bool> ExcluirAsync(int id);
}

public class FornecedorRepository : IFornecedorRepository
{
    private readonly IDbConnectionFactory _db;
    public FornecedorRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IEnumerable<Fornecedor>> ListarAsync()
    {
        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<Fornecedor>(
            "select id, nome, cnpj, telefone, email from fornecedores order by nome");
    }

    public async Task<int> InserirAsync(FornecedorRequest r)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteScalarAsync<int>(
            @"insert into fornecedores (nome, cnpj, telefone, email)
              values (@Nome, @Cnpj, @Telefone, @Email) returning id",
            new { Nome = r.Nome!.Trim(), r.Cnpj, r.Telefone, r.Email });
    }

    public async Task<bool> AtualizarAsync(int id, FornecedorRequest r)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteAsync(
            @"update fornecedores set nome = @Nome, cnpj = @Cnpj, telefone = @Telefone, email = @Email
              where id = @Id",
            new { Id = id, Nome = r.Nome!.Trim(), r.Cnpj, r.Telefone, r.Email }) > 0;
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteAsync("delete from fornecedores where id = @id", new { id }) > 0;
    }
}
