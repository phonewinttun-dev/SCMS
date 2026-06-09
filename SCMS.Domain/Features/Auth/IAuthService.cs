using SCMS.Shared;
using SCMS.Shared.Contracts.Auth;

namespace SCMS.Domain.Features.Auth
{
    public interface IAuthService
    {
        Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request);
        Task<Result<AuthResponse>> LoginAsync(LoginRequest request);
        Task<Result<AuthResponse>> RefreshAsync(RefreshTokenRequest request);
        Task<Result> LogoutAsync(string refreshToken);
        Task<Result<CurrentUserResponse>> GetCurrentUserAsync(int userId);
    }
}
