namespace Ferkautoparts.Api.Exceptions;

/// <summary>Regra de negócio violada (HTTP 400).</summary>
public class RegraNegocioException : Exception
{
    public RegraNegocioException(string mensagem) : base(mensagem) { }
}

/// <summary>Registro não encontrado (HTTP 404).</summary>
public class NaoEncontradoException : Exception
{
    public NaoEncontradoException(string mensagem) : base(mensagem) { }
}

/// <summary>Conflito com dados existentes (HTTP 409).</summary>
public class ConflitoException : Exception
{
    public ConflitoException(string mensagem) : base(mensagem) { }
}

/// <summary>Credenciais inválidas (HTTP 401).</summary>
public class NaoAutorizadoException : Exception
{
    public NaoAutorizadoException(string mensagem) : base(mensagem) { }
}
