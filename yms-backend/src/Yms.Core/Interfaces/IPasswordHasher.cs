namespace Yms.Core.Interfaces;

public interface IPasswordHasher
{
    (byte[] hash, byte[] salt, int iterations) HashPassword(string password);
    bool Verify(string password, byte[] hash, byte[] salt, int iterations);
}
