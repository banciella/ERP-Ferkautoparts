using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Exceptions;
using Ferkautoparts.Api.Models;
using Ferkautoparts.Api.Repositories;

namespace Ferkautoparts.Api.Services;

public interface IUsuarioService
{
    Task<IEnumerable<Usuario>> ListarAsync();
    Task<int> CriarAsync(UsuarioCriarRequest r);
    Task AtualizarAsync(int id, UsuarioAtualizarRequest r, int usuarioLogadoId);
}

public class UsuarioService : IUsuarioService
{
    private static readonly string[] Perfis = { "ADMIN", "OPERADOR" };
    private readonly IUsuarioRepository _repo;

    public UsuarioService(IUsuarioRepository repo) => _repo = repo;

    public Task<IEnumerable<Usuario>> ListarAsync() => _repo.ListarAsync();

    public async Task<int> CriarAsync(UsuarioCriarRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Nome)) throw new RegraNegocioException("Informe o nome.");
        if (string.IsNullOrWhiteSpace(r.Email) || !r.Email.Contains('@'))
            throw new RegraNegocioException("Informe um e-mail válido.");
        ValidarSenha(r.Senha);
        var perfil = ValidarPerfil(r.Perfil);

        return await _repo.InserirAsync(r.Nome.Trim(), r.Email.Trim().ToLower(), r.Senha!, perfil);
    }

    public async Task AtualizarAsync(int id, UsuarioAtualizarRequest r, int usuarioLogadoId)
    {
        if (string.IsNullOrWhiteSpace(r.Nome)) throw new RegraNegocioException("Informe o nome.");
        var perfil = ValidarPerfil(r.Perfil);
        if (!string.IsNullOrEmpty(r.NovaSenha)) ValidarSenha(r.NovaSenha);

        // evita que o admin se tranque para fora do sistema
        if (id == usuarioLogadoId && (!r.Ativo || perfil != "ADMIN"))
            throw new RegraNegocioException("Você não pode desativar nem rebaixar o seu próprio usuário.");

        var ok = await _repo.AtualizarAsync(id, r.Nome.Trim(), perfil, r.Ativo,
            string.IsNullOrEmpty(r.NovaSenha) ? null : r.NovaSenha);
        if (!ok) throw new NaoEncontradoException("Usuário não encontrado.");
    }

    private static string ValidarPerfil(string? perfil)
    {
        var p = (perfil ?? "").Trim().ToUpper();
        if (!Perfis.Contains(p)) throw new RegraNegocioException("Perfil deve ser ADMIN ou OPERADOR.");
        return p;
    }

    private static void ValidarSenha(string? senha)
    {
        if (string.IsNullOrEmpty(senha) || senha.Length < 6)
            throw new RegraNegocioException("A senha deve ter pelo menos 6 caracteres.");
    }
}
