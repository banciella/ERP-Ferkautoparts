using Npgsql;

namespace Ferkautoparts.Api.Data;

public interface IDbConnectionFactory
{
    Task<NpgsqlConnection> CriarAsync();
}

public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly NpgsqlDataSource _dataSource;

    public DbConnectionFactory(NpgsqlDataSource dataSource) => _dataSource = dataSource;

    public async Task<NpgsqlConnection> CriarAsync() => await _dataSource.OpenConnectionAsync();
}
