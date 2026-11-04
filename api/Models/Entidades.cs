namespace Ferkautoparts.Api.Models;

public class Usuario
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string Perfil { get; set; } = "";
    public bool Ativo { get; set; }
    public DateTime CriadoEm { get; set; }
}

public class Categoria
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string? Descricao { get; set; }
}

public class Fornecedor
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string? Cnpj { get; set; }
    public string? Telefone { get; set; }
    public string? Email { get; set; }
}

/// <summary>Produto já com categoria, fornecedor e situação do estoque (vem da view vw_estoque_status).</summary>
public class Produto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";
    public string Nome { get; set; } = "";
    public int CategoriaId { get; set; }
    public string Categoria { get; set; } = "";
    public int? FornecedorId { get; set; }
    public string? Fornecedor { get; set; }
    public decimal PrecoCompra { get; set; }
    public decimal PrecoVenda { get; set; }
    public int EstoqueAtual { get; set; }
    public int EstoqueMinimo { get; set; }
    public string Status { get; set; } = "";
    public string? Descricao { get; set; }
    public string StatusEstoque { get; set; } = "";
    public bool AbaixoMinimo { get; set; }
}

public class Movimentacao
{
    public int Id { get; set; }
    public int ProdutoId { get; set; }
    public string ProdutoCodigo { get; set; } = "";
    public string ProdutoNome { get; set; } = "";
    public string Tipo { get; set; } = "";
    public int Quantidade { get; set; }
    public int EstoqueAnterior { get; set; }
    public int EstoqueFinal { get; set; }
    public string? Motivo { get; set; }
    public string Usuario { get; set; } = "";
    public DateTime CriadoEm { get; set; }
}

public class RegistroAuditoria
{
    public long Id { get; set; }
    public string Tabela { get; set; } = "";
    public string Operacao { get; set; } = "";
    public int? RegistroId { get; set; }
    public string? DadosAntes { get; set; }
    public string? DadosDepois { get; set; }
    public DateTime CriadoEm { get; set; }
}

public class ResumoCategoria
{
    public string Categoria { get; set; } = "";
    public long Produtos { get; set; }
    public long Unidades { get; set; }
    public decimal ValorEstoque { get; set; }
    public long Criticos { get; set; }
}

public class SugestaoCompra
{
    public int ProdutoId { get; set; }
    public string Codigo { get; set; } = "";
    public string Nome { get; set; } = "";
    public string Categoria { get; set; } = "";
    public string Fornecedor { get; set; } = "";
    public int EstoqueAtual { get; set; }
    public int EstoqueIdeal { get; set; }
    public int QtdComprar { get; set; }
    public decimal CustoEstimado { get; set; }
}

public class MovimentoDia
{
    public string Dia { get; set; } = "";
    public string Tipo { get; set; } = "";
    public long Total { get; set; }
}

public class Dashboard
{
    public long ProdutosAtivos { get; set; }
    public long UnidadesEmEstoque { get; set; }
    public decimal ValorEstoque { get; set; }
    public int TotalCriticos { get; set; }
    public List<Produto> Criticos { get; set; } = new();
    public List<ResumoCategoria> PorCategoria { get; set; } = new();
    public List<MovimentoDia> MovimentosUltimos7Dias { get; set; } = new();
}
