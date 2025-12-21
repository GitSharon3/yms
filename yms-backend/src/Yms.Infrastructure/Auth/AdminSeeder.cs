using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;

using Yms.Core.Entities;
using Yms.Core.Enums;
using Yms.Core.Interfaces;
using Yms.Core.Settings;

namespace Yms.Infrastructure.Auth;

public sealed class AdminSeeder
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwords;
    private readonly AdminSeedSettings _seed;
    private readonly IHostEnvironment _env;

    public AdminSeeder(IUserRepository users, IPasswordHasher passwords, IOptions<AdminSeedSettings> seed, IHostEnvironment env)
    {
        _users = users;
        _passwords = passwords;
        _seed = seed.Value;
        _env = env;
    }

    public async Task EnsureSeededAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_seed.Email) || string.IsNullOrWhiteSpace(_seed.Username) || string.IsNullOrWhiteSpace(_seed.Password))
        {
            return;
        }

        var email = _seed.Email.Trim().ToLowerInvariant();
        var username = _seed.Username.Trim();

        var existing = await _users.GetByIdentifierAsync(username, cancellationToken) ?? await _users.GetByIdentifierAsync(email, cancellationToken);

        var (hash, salt, iterations) = _passwords.HashPassword(_seed.Password);

        if (existing is null)
        {
            await _users.AddAsync(new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                Username = username,
                PasswordHash = hash,
                PasswordSalt = salt,
                PasswordIterations = iterations,
                Role = UserRole.Admin,
                CreatedAtUtc = DateTime.UtcNow
            }, cancellationToken);
        }
        else
        {
            if (!_env.IsDevelopment())
            {
                return;
            }

            existing.Email = email;
            existing.Username = username;
            existing.PasswordHash = hash;
            existing.PasswordSalt = salt;
            existing.PasswordIterations = iterations;
            existing.Role = UserRole.Admin;
        }

        await _users.SaveChangesAsync(cancellationToken);
    }
}
