using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

using yms_backend.Data;
using yms_backend.Models;

namespace yms_backend.Auth;

public sealed class AdminSeeder
{
    private readonly YmsDbContext _db;
    private readonly AdminSeedSettings _seed;
    private readonly IHostEnvironment _env;

    public AdminSeeder(YmsDbContext db, IOptions<AdminSeedSettings> seed, IHostEnvironment env)
    {
        _db = db;
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

        var (hash, salt, iterations) = PasswordHasher.HashPassword(_seed.Password);

        var existing = await _db.AdminUsers
            .FirstOrDefaultAsync(x => x.Username == username || x.Email == email, cancellationToken);

        if (existing is null)
        {
            _db.AdminUsers.Add(new AdminUser
            {
                Email = email,
                Username = username,
                PasswordHash = hash,
                PasswordSalt = salt,
                PasswordIterations = iterations,
                CreatedAtUtc = DateTime.UtcNow
            });
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
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
