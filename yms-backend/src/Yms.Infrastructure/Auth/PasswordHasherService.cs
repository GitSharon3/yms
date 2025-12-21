using System.Security.Cryptography;

using Yms.Core.Interfaces;

namespace Yms.Infrastructure.Auth;

public sealed class PasswordHasherService : IPasswordHasher
{
    private const int DefaultIterations = 100_000;

    public (byte[] hash, byte[] salt, int iterations) HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var iterations = DefaultIterations;

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);
        return (hash, salt, iterations);
    }

    public bool Verify(string password, byte[] hash, byte[] salt, int iterations)
    {
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var computed = pbkdf2.GetBytes(32);
        return CryptographicOperations.FixedTimeEquals(computed, hash);
    }
}
