using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SCMS.Database.Models;

namespace SCMS.Domain.Database;

public static class ScmsDatabaseInitializer
{
    public static async Task InitializeScmsDatabaseAsync(this WebApplication app)
    {
        var provider = app.Configuration["Database:Provider"]?.Trim();
        if (string.IsNullOrWhiteSpace(provider))
        {
            provider = "Sqlite";
        }

        var isSqlite = provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase)
            || provider.Equals("SQLite", StringComparison.OrdinalIgnoreCase);

        var ensureCreated = app.Configuration.GetValue("Database:EnsureCreated", isSqlite);
        var seedOnStartup = app.Configuration.GetValue("Database:SeedOnStartup", isSqlite);

        if (!ensureCreated && (!seedOnStartup || !isSqlite))
        {
            return;
        }

        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("SCMS.Database");

        if (ensureCreated)
        {
            await context.Database.EnsureCreatedAsync();
        }

        if (!isSqlite || !seedOnStartup)
        {
            return;
        }

        var hasPatientSeed = await context.TblUsers
            .AnyAsync(user => user.Email == "aung.min@example.test");
        if (hasPatientSeed)
        {
            return;
        }

        var configuredSeedPath = app.Configuration["Database:SqliteSeedPath"];
        var seedPath = string.IsNullOrWhiteSpace(configuredSeedPath)
            ? Path.Combine(app.Environment.ContentRootPath, "Seed", "seed.sqlite.sql")
            : configuredSeedPath;

        if (!Path.IsPathRooted(seedPath))
        {
            seedPath = Path.Combine(app.Environment.ContentRootPath, seedPath);
        }

        if (!File.Exists(seedPath))
        {
            throw new FileNotFoundException("SQLite seed file was not found.", seedPath);
        }

        var seedSql = await File.ReadAllTextAsync(seedPath);
        await context.Database.ExecuteSqlRawAsync(seedSql);
        logger.LogInformation("SQLite demo seed data loaded from {SeedPath}.", seedPath);
    }
}
