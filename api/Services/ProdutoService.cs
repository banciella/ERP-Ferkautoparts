using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Exceptions;
using Ferkautoparts.Api.Models;
using Ferkautoparts.Api.Repositories;

namespace Ferkautoparts.Api.Services;

public interface IProdutoService
{
    Task<IEnumerable<Produto>> ListarAsync(string? busca, string? status, string? statusEstoque, int? categoriaId);
    Task<Produto> ObterAsync(int id);
    Task<int> CriarAsync(ProdutoRequest r);
    Task AtualizarAsync(int id, ProdutoRequest r);
    Task ExcluirAsync(int id);
}

public class ProdutoService : IProdutoService
{
    private static readonly string[] StatusValidos = { "ATIVO", "INATIVO", "OBSOLETO" };
    private readonly IProdutoRepository _repo;

    public ProdutoService(IProdutoRepository repo) => _repo = repo;

    public Task<IEnumerable<Produto>> ListarAsync(string? busca, string? status, string? statusEstoque, int? categoriaId)
        => _repo.ListarAsync(busca, status, statusEstoque, categoriaId);

    public async Task<Produto> ObterAsync(int id)
        => await _repo.ObterAsync(id) ?? throw new NaoEncontradoException("Produto não encontrado.");

    public async Task<int> CriarAsync(ProdutoRequest r)
    {
        Validar(r);
        if ((r.EstoqueAtual ?? 0) < 0) throw new RegraNegocioException("Estoque não pode ser negativo.");
        return await _repo.InserirAsync(r);
    }

    public async Task AtualizarAsync(int id, ProdutoRequest r)
    {
        Validar(r);
        if (!await _repo.AtualizarAsync(id, r))
            throw new NaoEncontradoException("Produto não encontrado.");
    }

    public async Task ExcluirAsync(int id)
    {
        if (!await _repo.ExcluirAsync(id))
            throw new NaoEncontradoException("Produto não encontrado.");
    }

    private static void Validar(ProdutoRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Codigo)) throw new RegraNegocioException("Informe o código (SKU).");
        if (string.IsNullOrWhiteSpace(r.Nome)) throw new RegraNegocioException("Informe o nome.");
        if (r.CategoriaId <= 0) throw new RegraNegocioException("Informe a categoria.");
        if (r.PrecoCompra < 0 || r.PrecoVenda < 0) throw new RegraNegocioException("Preços não podem ser negativos.");
        if (r.EstoqueMinimo < 0) throw new RegraNegocioException("Estoque mínimo não pode ser negativo.");
        if (!StatusValidos.Contains((r.Status ?? "ATIVO").ToUpper()))
            throw new RegraNegocioException("Status deve ser ATIVO, INATIVO ou OBSOLETO.");
    }
}
