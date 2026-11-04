using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Extensions;
using Ferkautoparts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ferkautoparts.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = "ADMIN")]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioService _service;
    public UsuariosController(IUsuarioService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await _service.ListarAsync());

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] UsuarioCriarRequest r)
    {
        var id = await _service.CriarAsync(r);
        return Created($"/api/usuarios/{id}", new { id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] UsuarioAtualizarRequest r)
    {
        await _service.AtualizarAsync(id, r, User.GetUsuarioId());
        return Ok(new { id });
    }
}
