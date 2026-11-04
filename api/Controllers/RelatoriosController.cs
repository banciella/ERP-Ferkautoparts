using Ferkautoparts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ferkautoparts.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class RelatoriosController : ControllerBase
{
    private readonly IRelatorioService _service;
    public RelatoriosController(IRelatorioService service) => _service = service;

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard() => Ok(await _service.DashboardAsync());

    [HttpGet("relatorios/por-categoria")]
    public async Task<IActionResult> PorCategoria() => Ok(await _service.PorCategoriaAsync());

    [HttpGet("relatorios/sugestao-compra")]
    public async Task<IActionResult> SugestaoCompra([FromQuery] int? estoqueIdeal)
        => Ok(await _service.SugestaoCompraAsync(estoqueIdeal));

    [HttpGet("auditoria"), Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Auditoria([FromQuery] string? tabela, [FromQuery] int? limite)
        => Ok(await _service.AuditoriaAsync(tabela, limite));
}
