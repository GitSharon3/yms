using Yms.Core.Dtos.Yards;

namespace Yms.Core.Interfaces;

public interface IYardService
{
    Task<List<YardDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<YardDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<YardDto> CreateAsync(CreateYardRequestDto request, CancellationToken cancellationToken);
    Task<YardDto?> UpdateAsync(Guid id, UpdateYardRequestDto request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
