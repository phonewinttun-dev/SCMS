using System.Security.Claims;
using SCMS.Database.Models;

namespace SCMS.Domain.Features.Auth
{
    public interface ITokenService
    {
        DateTime AccessTokenExpiresAt { get; }
        DateTime RefreshTokenExpiresAt { get; }
        string CreateRefreshToken();
        string HashToken(string token);
        string GenerateAccessToken(TblUser user);
        string GenerateRefreshToken();
        ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
    }
}
