using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ferkautoparts.Api.Controllers;

[ApiController]
[Route("api/produtos")]
[Authorize]
public class ProdutosController : ControllerBase
{
    private readonly IProdutoService _service;
    public ProdutosController(IProdutoService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? busca, [FromQuery] string? status,
        [FromQuery] string? statusEstoque, [FromQuery] int? categoriaId)
        => Ok(await _service.ListarAsync(busca, status, statusEstoque, categoriaId));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Obter(int id) => Ok(await _service.ObterAsync(id));

    [HttpPost, Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Criar([FromBody] ProdutoRequest r)
    {
        var id = await _service.CriarAsync(r);
        return Created($"/api/produtos/{id}", new { id });
    }

    [HttpPut("{id:int}"), Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] ProdutoRequest r)
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
