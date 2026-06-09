using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Shared;
using SCMS.Shared.Contracts.Auth;

namespace SCMS.Domain.Features.Auth
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IPasswordHashingService _passwords;
        private readonly ITokenService _tokens;

        public AuthService(AppDbContext context, IPasswordHashingService passwords, ITokenService tokens)
        {
            _context = context;
            _passwords = passwords;
            _tokens = tokens;
        }

        public async Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Result<AuthResponse>.Failure("Name is required.");
            }
            if (string.IsNullOrWhiteSpace(request.MobileNo))
            {
                return Result<AuthResponse>.Failure("Mobile Number is required.");
            }
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            {
                return Result<AuthResponse>.Failure("Password must be at least 8 characters.");
            }

            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
            var mobile = request.MobileNo.Trim();
            var exists = await _context.TblUsers.AnyAsync(u => u.DeleteFlag != true &&
                ((email != null && u.Email != null && u.Email.ToLower() == email) || u.MobileNo == mobile));

            if (exists)
            {
                return Result<AuthResponse>.Failure("An account with that email or mobile number already exists.");
            }

            var user = new TblUser
            {
                Name = request.Name.Trim(),
                Email = email,
                MobileNo = mobile,
                PasswordHash = _passwords.HashPassword(request.Password),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblUsers.Add(user);
            await _context.SaveChangesAsync();

            _context.TblUserRoles.Add(new TblUserRole
            {
                UserId = user.UserId,
                Role = "user"
            });
            await _context.SaveChangesAsync();

            return await IssueTokensAsync(user, "Account created.");
        }

        public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EmailOrMobile) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Result<AuthResponse>.Failure("Email/mobile and password are required.");
            }

            var login = request.EmailOrMobile.Trim().ToLower();
            var user = await _context.TblUsers
                .Include(u => u.TblUserRoles)
                .FirstOrDefaultAsync(u => u.DeleteFlag != true
                    && ((u.Email != null && u.Email.ToLower() == login) || (u.MobileNo != null && u.MobileNo == request.EmailOrMobile.Trim())));

            if (user == null || !_passwords.VerifyPassword(user.PasswordHash, request.Password))
            {
                return Result<AuthResponse>.Failure("Invalid credentials.");
            }

            return await IssueTokensAsync(user, "Login successful.");
        }

        public async Task<Result<AuthResponse>> RefreshAsync(RefreshTokenRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
            {
                return Result<AuthResponse>.Failure("Refresh token is required.");
            }

            var tokenHash = _tokens.HashToken(request.RefreshToken);
            var token = await _context.TblUserTokens
                .Include(t => t.User)
                    .ThenInclude(u => u.TblUserRoles)
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.Revoked && t.ExpiresAt > DateTime.UtcNow);

            if (token == null || token.User.DeleteFlag == true)
            {
                return Result<AuthResponse>.Failure("Refresh token is invalid or expired.");
            }

            token.Revoked = true;
            await _context.SaveChangesAsync();

            return await IssueTokensAsync(token.User, "Token refreshed.");
        }

        public async Task<Result<CurrentUserResponse>> GetCurrentUserAsync(int userId)
        {
            var user = await _context.TblUsers
                .Include(u => u.TblUserRoles)
                .FirstOrDefaultAsync(u => u.UserId == userId && u.DeleteFlag != true);

            if (user == null)
            {
                return Result<CurrentUserResponse>.Failure("User not found.");
            }

            return Result<CurrentUserResponse>.Success(MapUser(user));
        }

        private async Task<Result<AuthResponse>> IssueTokensAsync(TblUser user, string message)
        {
            var roles = GetNormalizedRoles(user);
            var expiresAt = _tokens.AccessTokenExpiresAt;
            var accessToken = _tokens.GenerateAccessToken(user);
            var refreshToken = _tokens.CreateRefreshToken();

            _context.TblUserTokens.Add(new TblUserToken
            {
                UserId = user.UserId,
                TokenHash = _tokens.HashToken(refreshToken),
                ExpiresAt = _tokens.RefreshTokenExpiresAt,
                Revoked = false,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Result<AuthResponse>.Success(new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
                User = MapUser(user, roles)
            }, message);
        }

        private static CurrentUserResponse MapUser(TblUser user, IReadOnlyCollection<string>? roles = null)
            => new()
            {
                UserId = user.UserId,
                Name = user.Name,
                Email = user.Email,
                MobileNo = user.MobileNo,
                Roles = (roles ?? GetNormalizedRoles(user)).ToList()
            };

        private static List<string> GetNormalizedRoles(TblUser user)
        {
            var roles = user.TblUserRoles
                .Select(r => r.Role.Trim().ToLowerInvariant())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Distinct()
                .ToList();

            return roles.Count == 0 ? new List<string> { "user" } : roles;
        }
    }
}
