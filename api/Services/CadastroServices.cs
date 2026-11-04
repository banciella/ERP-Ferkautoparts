using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Exceptions;
using Ferkautoparts.Api.Models;
using Ferkautoparts.Api.Repositories;

namespace Ferkautoparts.Api.Services;

// ---------------------------------------------------------------- Categorias
public interface ICategoriaService
{
    Task<IEnumerable<Categoria>> ListarAsync();
    Task<int> CriarAsync(CategoriaRequest r);
    Task AtualizarAsync(int id, CategoriaRequest r);
    Task ExcluirAsync(int id);
}

public class CategoriaService : ICategoriaService
{
    private readonly ICategoriaRepository _repo;
    public CategoriaService(ICategoriaRepository repo) => _repo = repo;

    public Task<IEnumerable<Categoria>> ListarAsync() => _repo.ListarAsync();

    public Task<int> CriarAsync(CategoriaRequest r)
    {
        Validar(r);
        return _repo.InserirAsync(r);
    }

    public async Task AtualizarAsync(int id, CategoriaRequest r)
    {
        Validar(r);
        if (!await _repo.AtualizarAsync(id, r)) throw new NaoEncontradoException("Categoria não encontrada.");
    }

    public async Task ExcluirAsync(int id)
    {
        if (!await _repo.ExcluirAsync(id)) throw new NaoEncontradoException("Categoria não encontrada.");
    }

    private static void Validar(CategoriaRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Nome)) throw new RegraNegocioException("Informe o nome da categoria.");
    }
}

// ---------------------------------------------------------------- Fornecedores
public interface IFornecedorService
{
    Task<IEnumerable<Fornecedor>> ListarAsync();
    Task<int> CriarAsync(FornecedorRequest r);
    Task AtualizarAsync(int id, FornecedorRequest r);
    Task ExcluirAsync(int id);
}

public class FornecedorService : IFornecedorService
{
    private readonly IFornecedorRepository _repo;
    public FornecedorService(IFornecedorRepository repo) => _repo = repo;

    public Task<IEnumerable<Fornecedor>> ListarAsync() => _repo.ListarAsync();

    public Task<int> CriarAsync(FornecedorRequest r)
    {
        Validar(r);
        return _repo.InserirAsync(r);
    }

    public async Task AtualizarAsync(int id, FornecedorRequest r)
    {
        Validar(r);
        if (!await _repo.AtualizarAsync(id, r)) throw new NaoEncontradoException("Fornecedor não encontrado.");
    }

    public async Task ExcluirAsync(int id)
    {
        if (!await _repo.ExcluirAsync(id)) throw new NaoEncontradoException("Fornecedor não encontrado.");
    }

    private static void Validar(FornecedorRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Nome)) throw new RegraNegocioException("Informe o nome do fornecedor.");
    }
}
