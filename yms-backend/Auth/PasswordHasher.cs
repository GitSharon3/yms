using System.Security.Cryptography;

namespace yms_backend.Auth;

public static class PasswordHasher
{
    private const int SaltSizeBytes = 16;
    private const int HashSizeBytes = 32;

    public static (byte[] hash, byte[] salt, int iterations) HashPassword(string password, int iterations = 150_000)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSizeBytes);

        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            HashSizeBytes);
        return (hash, salt, iterations);
    }

    public static bool Verify(string password, byte[] expectedHash, byte[] salt, int iterations)
    {
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            HashSizeBytes);
        return CryptographicOperations.FixedTimeEquals(hash, expectedHash);
    }
}
