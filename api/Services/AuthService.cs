using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Ferkautoparts.Api.Dtos;
using Ferkautoparts.Api.Exceptions;
using Ferkautoparts.Api.Repositories;
using Microsoft.IdentityModel.Tokens;

namespace Ferkautoparts.Api.Services;

public class JwtOptions
{
    public string Key { get; set; } = "";
    public int HorasValidade { get; set; } = 8;
}

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest req);
}

public class AuthService : IAuthService
{
    private readonly IUsuarioRepository _usuarios;
    private readonly JwtOptions _jwt;

    public AuthService(IUsuarioRepository usuarios, JwtOptions jwt)
    {
        _usuarios = usuarios;
        _jwt = jwt;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Senha))
            throw new RegraNegocioException("Informe e-mail e senha.");

        var usuario = await _usuarios.ValidarCredenciaisAsync(req.Email.Trim(), req.Senha)
            ?? throw new NaoAutorizadoException("E-mail ou senha inválidos.");

        var claims = new[]
        {
            new Claim("sub", usuario.Id.ToString()),
            new Claim("name", usuario.Nome),
            new Claim("role", usuario.Perfil)
        };
        var credenciais = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_jwt.HorasValidade),
            signingCredentials: credenciais);

        return new LoginResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            Usuario = usuario
        };
    }
}
