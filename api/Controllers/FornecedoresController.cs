using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ferkautoparts.Api.Controllers;

[ApiController]
[Route("api/fornecedores")]
[Authorize]
public class FornecedoresController : ControllerBase
{
    private readonly IFornecedorService _service;
    public FornecedoresController(IFornecedorService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await _service.ListarAsync());

    [HttpPost, Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Criar([FromBody] FornecedorRequest r)
    {
        var id = await _service.CriarAsync(r);
        return Created($"/api/fornecedores/{id}", new { id });
    }

    [HttpPut("{id:int}"), Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] FornecedorRequest r)
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
