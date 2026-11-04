namespace Ferkautoparts.Api.Dtos;

public class LoginRequest
{
    public string? Email { get; set; }
    public string? Senha { get; set; }
}

public class LoginResponse
{
    public string Token { get; set; } = "";
    public Models.Usuario Usuario { get; set; } = new();
}

public class ProdutoRequest
{
    public string? Codigo { get; set; }
    public string? Nome { get; set; }
    public int CategoriaId { get; set; }
    public int? FornecedorId { get; set; }
    public decimal PrecoCompra { get; set; }
    public decimal PrecoVenda { get; set; }
    public int? EstoqueAtual { get; set; }      // só usado na criação
    public int EstoqueMinimo { get; set; }
    public string? Status { get; set; }
    public string? Descricao { get; set; }
}

public class MovimentacaoRequest
{
    public int ProdutoId { get; set; }
    public string? Tipo { get; set; }
    public int Quantidade { get; set; }
    public string? Motivo { get; set; }
}

public class CategoriaRequest
{
    public string? Nome { get; set; }
    public string? Descricao { get; set; }
}

public class FornecedorRequest
{
    public string? Nome { get; set; }
    public string? Cnpj { get; set; }
    public string? Telefone { get; set; }
    public string? Email { get; set; }
}

public class UsuarioCriarRequest
{
    public string? Nome { get; set; }
    public string? Email { get; set; }
    public string? Senha { get; set; }
    public string? Perfil { get; set; }
}

public class UsuarioAtualizarRequest
{
    public string? Nome { get; set; }
    public string? Perfil { get; set; }
    public bool Ativo { get; set; } = true;
    public string? NovaSenha { get; set; }
}
