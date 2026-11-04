using Ferkautoparts.Api.Exceptions;
using Npgsql;

namespace Ferkautoparts.Api.Middleware;

/// <summary>Captura exceções de qualquer camada e devolve JSON { erro } com o status correto.</summary>
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _log;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> log)
    {
        _next = next;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (Exception ex)
        {
            var (status, mensagem) = Traduzir(ex);
            if (status == 500) _log.LogError(ex, "Erro não tratado");

            ctx.Response.StatusCode = status;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsJsonAsync(new { erro = mensagem });
        }
    }

    private static (int, string) Traduzir(Exception ex)
    {
        switch (ex)
        {
            case RegraNegocioException:   return (400, ex.Message);
            case NaoEncontradoException:  return (404, ex.Message);
            case ConflitoException:       return (409, ex.Message);
            case NaoAutorizadoException:  return (401, ex.Message);
            case PostgresException pg:    return TraduzirBanco(pg);
            default:                      return (500, "Erro interno do servidor.");
        }
    }

    private static (int, string) TraduzirBanco(PostgresException pg)
    {
        switch (pg.SqlState)
        {
            case "P0001": return (400, pg.MessageText);   // RAISE EXCEPTION do trigger/procedure
            case "23505": return (409, "Já existe um registro com esse valor único (ex.: código, nome ou e-mail).");
            case "23503": return (409, "Registro ligado a outros dados (ex.: possui produtos ou movimentações). Inative em vez de excluir.");
            case "23514": return (400, "Valor inválido (violou uma regra do banco).");
            case "23502": return (400, "Campo obrigatório ausente.");
            default:      return (500, "Erro interno no banco de dados.");
        }
    }
}
