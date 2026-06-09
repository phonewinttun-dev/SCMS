namespace SCMS.Shared.Contracts.Auth
{
    public class RegisterRequest
    {
        public string Name { get; set; } = null!;
        public string MobileNo { get; set; } = null!;
        public string? Email { get; set; }
        public string Password { get; set; } = null!;
    }

    public class LoginRequest
    {
        public string EmailOrMobile { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = null!;
    }

    public class AuthResponse
    {
        public string AccessToken { get; set; } = null!;
        public string RefreshToken { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public CurrentUserResponse User { get; set; } = new();
    }

    public class CurrentUserResponse
    {
        public int UserId { get; set; }
        public string Name { get; set; } = null!;
        public string? Email { get; set; }
        public string? MobileNo { get; set; }
        public List<string> Roles { get; set; } = new();

        public bool IsStaff => Roles.Any(r => string.Equals(r, "owner", StringComparison.OrdinalIgnoreCase)
            || string.Equals(r, "admin", StringComparison.OrdinalIgnoreCase)
            || string.Equals(r, "doctor", StringComparison.OrdinalIgnoreCase));
    }
}
