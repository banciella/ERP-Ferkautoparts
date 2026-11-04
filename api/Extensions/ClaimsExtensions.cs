using System.Security.Claims;

namespace Ferkautoparts.Api.Extensions;

public static class ClaimsExtensions
{
    /// <summary>Id do usuário logado (claim "sub" do JWT).</summary>
    public static int GetUsuarioId(this ClaimsPrincipal user)
        => int.Parse(user.FindFirst("sub")?.Value ?? "0");
}
