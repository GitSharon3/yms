using Microsoft.EntityFrameworkCore;

using Yms.Core.Entities;
using Yms.Core.Interfaces;
using Yms.Infrastructure.Data;

namespace Yms.Infrastructure.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly YmsDbContext _db;

    public UserRepository(YmsDbContext db)
    {
        _db = db;
    }

    public async Task<User?> GetByIdentifierAsync(string identifier, CancellationToken cancellationToken)
    {
        var trimmed = identifier.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return null;
        }

        var email = trimmed.Contains('@') ? trimmed.ToLowerInvariant() : null;
        return await _db.Users
            .FirstOrDefaultAsync(x => x.Username == trimmed || (email != null && x.Email == email), cancellationToken);
    }

    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return _db.Users.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken)
    {
        await _db.Users.AddAsync(user, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
