using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ferkautoparts.Api.Controllers;

[ApiController]
[Route("api/categorias")]
[Authorize]
public class CategoriasController : ControllerBase
{
    private readonly ICategoriaService _service;
    public CategoriasController(ICategoriaService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await _service.ListarAsync());

    [HttpPost, Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Criar([FromBody] CategoriaRequest r)
    {
        var id = await _service.CriarAsync(r);
        return Created($"/api/categorias/{id}", new { id });
    }

    [HttpPut("{id:int}"), Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] CategoriaRequest r)
    {
        await _service.AtualizarAsync(id, r);
        return Ok(new { id });
    }

    [HttpDelete("{id:int}"), Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Excluir(int id)
    {
        await _service.ExcluirAsync(id);
        return NoContent();
    }
}
