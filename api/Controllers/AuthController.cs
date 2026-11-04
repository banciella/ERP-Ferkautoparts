using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Extensions;
using Ferkautoparts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ferkautoparts.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("login"), AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
        => Ok(await _auth.LoginAsync(req));

    [HttpGet("me"), Authorize]
    public IActionResult Me() => Ok(new
    {
        id = User.GetUsuarioId(),
        nome = User.FindFirst("name")?.Value,
        perfil = User.FindFirst("role")?.Value
    });
}
