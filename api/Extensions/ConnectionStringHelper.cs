using Npgsql;

namespace Ferkautoparts.Api.Extensions;

public static class ConnectionStringHelper
{
    /// <summary>Aceita a string no formato URI do Supabase (postgresql://...) ou o formato Npgsql.</summary>
    public static string ToNpgsql(string raw)
    {
        if (!raw.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
            return raw;

        var uri = new Uri(raw);
        var info = uri.UserInfo;
        var i = info.IndexOf(':');
        var user = Uri.UnescapeDataString(i >= 0 ? info[..i] : info);
        var pass = Uri.UnescapeDataString(i >= 0 ? info[(i + 1)..] : "");

        return new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.Trim('/'),
            Username = user,
            Password = pass,
            SslMode = SslMode.Require,
            MaxPoolSize = 5
        }.ConnectionString;
    }
}
