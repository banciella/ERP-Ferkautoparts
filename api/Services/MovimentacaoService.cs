using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Exceptions;
using Ferkautoparts.Api.Models;
using Ferkautoparts.Api.Repositories;

namespace Ferkautoparts.Api.Services;

public interface IMovimentacaoService
{
    Task<IEnumerable<Movimentacao>> ListarAsync(int? produtoId, string? tipo, int? limite);
    Task<int> RegistrarAsync(MovimentacaoRequest r, int usuarioId);
}

public class MovimentacaoService : IMovimentacaoService
{
    private readonly IMovimentacaoRepository _repo;
    public MovimentacaoService(IMovimentacaoRepository repo) => _repo = repo;

    public Task<IEnumerable<Movimentacao>> ListarAsync(int? produtoId, string? tipo, int? limite)
        => _repo.ListarAsync(produtoId, tipo, Math.Clamp(limite ?? 50, 1, 500));

    public async Task<int> RegistrarAsync(MovimentacaoRequest r, int usuarioId)
    {
        var tipo = (r.Tipo ?? "").Trim().ToUpper();
        if (tipo != "ENTRADA" && tipo != "SAIDA")
            throw new RegraNegocioException("Tipo deve ser ENTRADA ou SAIDA.");
        if (r.ProdutoId <= 0)
            throw new RegraNegocioException("Informe o produto.");
        if (r.Quantidade <= 0)
            throw new RegraNegocioException("Quantidade deve ser maior que zero.");

        return await _repo.RegistrarAsync(r, tipo, usuarioId);
    }
}
