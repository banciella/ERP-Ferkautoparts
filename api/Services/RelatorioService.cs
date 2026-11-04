using Ferkautoparts.Api.Models;
using Ferkautoparts.Api.Repositories;

namespace Ferkautoparts.Api.Services;

public interface IRelatorioService
{
    Task<Dashboard> DashboardAsync();
    Task<IEnumerable<ResumoCategoria>> PorCategoriaAsync();
    Task<IEnumerable<SugestaoCompra>> SugestaoCompraAsync(int? estoqueIdeal);
    Task<IEnumerable<RegistroAuditoria>> AuditoriaAsync(string? tabela, int? limite);
}

public class RelatorioService : IRelatorioService
{
    private readonly IRelatorioRepository _relatorios;
    private readonly IAuditoriaRepository _auditoria;

    public RelatorioService(IRelatorioRepository relatorios, IAuditoriaRepository auditoria)
    {
        _relatorios = relatorios;
        _auditoria = auditoria;
    }

    public Task<Dashboard> DashboardAsync() => _relatorios.ObterDashboardAsync();

    public Task<IEnumerable<ResumoCategoria>> PorCategoriaAsync() => _relatorios.PorCategoriaAsync();

    public Task<IEnumerable<SugestaoCompra>> SugestaoCompraAsync(int? estoqueIdeal)
        => _relatorios.SugestaoCompraAsync(Math.Clamp(estoqueIdeal ?? 50, 1, 100000));

    public Task<IEnumerable<RegistroAuditoria>> AuditoriaAsync(string? tabela, int? limite)
        => _auditoria.ListarAsync(tabela, Math.Clamp(limite ?? 100, 1, 500));
}
