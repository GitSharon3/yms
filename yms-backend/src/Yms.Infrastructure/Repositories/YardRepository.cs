using Microsoft.EntityFrameworkCore;

using Yms.Core.Entities;
using Yms.Core.Interfaces;
using Yms.Infrastructure.Data;

namespace Yms.Infrastructure.Repositories;

public sealed class YardRepository : IYardRepository
{
    private readonly YmsDbContext _db;

    public YardRepository(YmsDbContext db)
    {
        _db = db;
    }

    public Task<List<Yard>> GetAllAsync(CancellationToken cancellationToken)
    {
        return _db.Yards
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<Yard?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return _db.Yards.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Yard yard, CancellationToken cancellationToken)
    {
        await _db.Yards.AddAsync(yard, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }

    public void Remove(Yard yard)
    {
        _db.Yards.Remove(yard);
    }
}
