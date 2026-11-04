using Dapper;
using Ferkautoparts.Api.Data;
using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Models;

namespace Ferkautoparts.Api.Repositories;

public interface ICategoriaRepository
{
    Task<IEnumerable<Categoria>> ListarAsync();
    Task<int> InserirAsync(CategoriaRequest r);
    Task<bool> AtualizarAsync(int id, CategoriaRequest r);
    Task<bool> ExcluirAsync(int id);
}

public class CategoriaRepository : ICategoriaRepository
{
    private readonly IDbConnectionFactory _db;
    public CategoriaRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IEnumerable<Categoria>> ListarAsync()
    {
        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<Categoria>("select id, nome, descricao from categorias order by nome");
    }

    public async Task<int> InserirAsync(CategoriaRequest r)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteScalarAsync<int>(
            "insert into categorias (nome, descricao) values (@Nome, @Descricao) returning id",
            new { Nome = r.Nome!.Trim(), r.Descricao });
    }

    public async Task<bool> AtualizarAsync(int id, CategoriaRequest r)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteAsync(
            "update categorias set nome = @Nome, descricao = @Descricao where id = @Id",
            new { Id = id, Nome = r.Nome!.Trim(), r.Descricao }) > 0;
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteAsync("delete from categorias where id = @id", new { id }) > 0;
    }
}
