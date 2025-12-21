using Yms.Core.Entities;

namespace Yms.Core.Interfaces;

public interface IYardRepository
{
    Task<List<Yard>> GetAllAsync(CancellationToken cancellationToken);
    Task<Yard?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task AddAsync(Yard yard, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
    void Remove(Yard yard);
}
