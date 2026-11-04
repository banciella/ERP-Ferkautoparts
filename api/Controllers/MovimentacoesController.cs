using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Extensions;
using Ferkautoparts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ferkautoparts.Api.Controllers;

[ApiController]
[Route("api/movimentacoes")]
[Authorize]
public class MovimentacoesController : ControllerBase
{
    private readonly IMovimentacaoService _service;
    public MovimentacoesController(IMovimentacaoService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? produtoId, [FromQuery] string? tipo, [FromQuery] int? limite)
        => Ok(await _service.ListarAsync(produtoId, tipo, limite));

    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] MovimentacaoRequest r)
    {
        var id = await _service.RegistrarAsync(r, User.GetUsuarioId());
        return Created($"/api/movimentacoes/{id}", new { id });
    }
}
