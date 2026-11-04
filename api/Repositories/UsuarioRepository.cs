using Dapper;
using Ferkautoparts.Api.Data;
using Ferkautoparts.Api.Models;

namespace Ferkautoparts.Api.Repositories;

public interface IUsuarioRepository
{
    Task<Usuario?> ValidarCredenciaisAsync(string email, string senha);
    Task<IEnumerable<Usuario>> ListarAsync();
    Task<Usuario?> ObterAsync(int id);
    Task<int> InserirAsync(string nome, string email, string senha, string perfil);
    Task<bool> AtualizarAsync(int id, string nome, string perfil, bool ativo, string? novaSenha);
}

public class UsuarioRepository : IUsuarioRepository
{
    private readonly IDbConnectionFactory _db;
    public UsuarioRepository(IDbConnectionFactory db) => _db = db;

    private const string SelectUsuario = @"
        select u.id, u.nome, u.email, p.nome as perfil, u.ativo, u.criado_em
          from usuarios u join perfis p on p.id = u.perfil_id";

    public async Task<Usuario?> ValidarCredenciaisAsync(string email, string senha)
    {
        await using var con = await _db.CriarAsync();
        // A senha é conferida no próprio banco (pgcrypto), comparando com o hash bcrypt
        return await con.QueryFirstOrDefaultAsync<Usuario>(
            SelectUsuario + @"
             where lower(u.email) = lower(@email)
               and u.ativo
               and u.senha_hash = crypt(@senha, u.senha_hash)",
            new { email, senha });
    }

    public async Task<IEnumerable<Usuario>> ListarAsync()
    {
        await using var con = await _db.CriarAsync();
        return await con.QueryAsync<Usuario>(SelectUsuario + " order by u.nome");
    }

    public async Task<Usuario?> ObterAsync(int id)
    {
        await using var con = await _db.CriarAsync();
        return await con.QueryFirstOrDefaultAsync<Usuario>(SelectUsuario + " where u.id = @id", new { id });
    }

    public async Task<int> InserirAsync(string nome, string email, string senha, string perfil)
    {
        await using var con = await _db.CriarAsync();
        return await con.ExecuteScalarAsync<int>(
            @"insert into usuarios (nome, email, senha_hash, perfil_id)
              values (@nome, @email, crypt(@senha, gen_salt('bf')),
                      (select id from perfis where nome = @perfil))
              returning id",
            new { nome, email, senha, perfil });
    }

    public async Task<bool> AtualizarAsync(int id, string nome, string perfil, bool ativo, string? novaSenha)
    {
        await using var con = await _db.CriarAsync();
        var n = await con.ExecuteAsync(
            @"update usuarios set
                nome = @nome,
                perfil_id = (select id from perfis where nome = @perfil),
                ativo = @ativo,
                senha_hash = case when @novaSenha::text is null then senha_hash
                                  else crypt(@novaSenha, gen_salt('bf')) end
              where id = @id",
            new { id, nome, perfil, ativo, novaSenha });
        return n > 0;
    }
}
