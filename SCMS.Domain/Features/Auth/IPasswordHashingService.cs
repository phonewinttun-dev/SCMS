namespace SCMS.Domain.Features.Auth
{
    public interface IPasswordHashingService
    {
        string HashPassword(string password);
        bool VerifyPassword(string storedHash, string password);
    }
}
