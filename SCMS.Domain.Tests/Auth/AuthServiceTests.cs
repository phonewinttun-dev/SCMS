using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SCMS.Database.Models;
using SCMS.Domain.Features.Auth;
using SCMS.Domain.Security;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared.Contracts.Auth;

namespace SCMS.Domain.Tests.Auth;

public class AuthServiceTests
{
    [Fact]
    public async Task RegisterAsync_CreatesPatientUserAndRefreshToken()
    {
        using var db = new TestDatabase();
        var service = CreateService(db);

        var result = await service.RegisterAsync(new RegisterRequest
        {
            Name = "New Patient",
            Email = "new.patient@example.test",
            MobileNo = "09999999999",
            Password = "StrongPass123"
        });

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrWhiteSpace(result.Data!.AccessToken));
        Assert.Contains("user", result.Data.User.Roles);
        Assert.Equal(1, await db.Context.TblUserTokens.CountAsync());
        Assert.True(await db.Context.TblUserRoles.AnyAsync(r => r.UserId == result.Data.User.UserId && r.Role == "user"));
    }

    [Fact]
    public async Task LoginAsync_AddsPatientAliasForLegacyUserRole()
    {
        using var db = new TestDatabase();
        var passwords = new PasswordHashingService();
        var user = TestData.AddUser(db, role: "user");
        user.PasswordHash = passwords.HashPassword("StrongPass123");
        await db.Context.SaveChangesAsync();
        var service = CreateService(db, passwords);

        var result = await service.LoginAsync(new LoginRequest
        {
            EmailOrMobile = user.Email!,
            Password = "StrongPass123"
        });

        Assert.True(result.IsSuccess);
        Assert.Contains("user", result.Data!.User.Roles);
    }

    [Fact]
    public async Task RefreshAsync_RevokesExistingTokenAndIssuesNewOne()
    {
        using var db = new TestDatabase();
        var passwords = new PasswordHashingService();
        var user = TestData.AddUser(db, role: "user");
        user.PasswordHash = passwords.HashPassword("StrongPass123");
        await db.Context.SaveChangesAsync();
        var service = CreateService(db, passwords);
        var login = await service.LoginAsync(new LoginRequest { EmailOrMobile = user.Email!, Password = "StrongPass123" });

        var refresh = await service.RefreshAsync(new RefreshTokenRequest { RefreshToken = login.Data!.RefreshToken });

        Assert.True(refresh.IsSuccess);
        Assert.NotEqual(login.Data.RefreshToken, refresh.Data!.RefreshToken);
        Assert.Equal(2, await db.Context.TblUserTokens.CountAsync());
        Assert.Equal(1, await db.Context.TblUserTokens.CountAsync(t => t.Revoked));
    }

    [Fact]
    public void CurrentUserExtensions_ReadUserIdAndStaffRoles()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "42"),
            new Claim(ClaimTypes.Role, "owner")
        }, "test"));

        Assert.Equal(42, principal.GetUserId());
        Assert.True(principal.IsStaff());
    }

    private static AuthService CreateService(TestDatabase db, IPasswordHashingService? passwords = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "SCMS.Tests",
                ["Jwt:Audience"] = "SCMS.Web.Tests",
                ["Jwt:SigningKey"] = "SCMS tests need a signing key that is comfortably long",
                ["Jwt:AccessTokenMinutes"] = "15",
                ["Jwt:RefreshTokenDays"] = "1"
            })
            .Build();

        return new AuthService(db.Context, passwords ?? new PasswordHashingService(), new TokenService(configuration));
    }
}
