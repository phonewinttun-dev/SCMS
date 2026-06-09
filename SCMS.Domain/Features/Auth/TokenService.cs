using Microsoft.Extensions.Configuration;
using SCMS.Database.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace SCMS.Domain.Features.Auth
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;

        public TokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public DateTime AccessTokenExpiresAt => DateTime.UtcNow.AddMinutes(GetAccessTokenMinutes());
        public DateTime RefreshTokenExpiresAt => DateTime.UtcNow.AddDays(GetRefreshTokenDays());



        public string CreateRefreshToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(48);
            return Base64UrlEncode(bytes);
        }

        public string HashToken(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes);
        }

        public string GenerateAccessToken(TblUser user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? GetSigningKey();
            var issuer = jwtSettings["Issuer"] ?? GetIssuer();
            var audience = jwtSettings["Audience"] ?? GetAudience();
            var expiryMinutes = double.Parse(jwtSettings["AccessTokenExpiryMinutes"] ?? GetAccessTokenMinutes().ToString());

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.MobilePhone, user.MobileNo ?? string.Empty),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.TblUserRoles.FirstOrDefault()?.Role ?? "user")
        };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        public ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? GetSigningKey();

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = false,
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateLifetime = false
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);

            if (securityToken is not JwtSecurityToken jwtSecurityToken || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                throw new SecurityTokenException("Invalid token");

            return principal;
        }

        private string GetSigningKey() =>
            _configuration.GetSection("JwtSettings")["SecretKey"] ??
            _configuration["Jwt:SigningKey"] ??
            "SCMS development signing key - replace outside local development";

        private string GetIssuer() =>
            _configuration.GetSection("JwtSettings")["Issuer"] ??
            _configuration["Jwt:Issuer"] ??
            "SCMS.Api";

        private string GetAudience() =>
            _configuration.GetSection("JwtSettings")["Audience"] ??
            _configuration["Jwt:Audience"] ??
            "SCMS.Web";

        private int GetAccessTokenMinutes()
        {
            var section = _configuration.GetSection("JwtSettings")["AccessTokenExpiryMinutes"];
            if (int.TryParse(section, out var res)) return res;
            if (int.TryParse(_configuration["Jwt:AccessTokenMinutes"], out res)) return res;
            return 60;
        }

        private int GetRefreshTokenDays()
        {
            var section = _configuration.GetSection("JwtSettings")["RefreshTokenExpiryDays"];
            if (int.TryParse(section, out var res)) return res;
            if (int.TryParse(_configuration["Jwt:RefreshTokenDays"], out res)) return res;
            return 7;
        }

        private static string Base64UrlEncode(byte[] bytes)
            => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
