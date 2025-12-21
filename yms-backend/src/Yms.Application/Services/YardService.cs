using AutoMapper;

using Yms.Core.Dtos.Yards;
using Yms.Core.Entities;
using Yms.Core.Interfaces;

namespace Yms.Application.Services;

public sealed class YardService : IYardService
{
    private readonly IYardRepository _yards;
    private readonly IMapper _mapper;

    public YardService(IYardRepository yards, IMapper mapper)
    {
        _yards = yards;
        _mapper = mapper;
    }

    public async Task<List<YardDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var yards = await _yards.GetAllAsync(cancellationToken);
        return yards.Select(_mapper.Map<YardDto>).ToList();
    }

    public async Task<YardDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var yard = await _yards.GetByIdAsync(id, cancellationToken);
        return yard is null ? null : _mapper.Map<YardDto>(yard);
    }

    public async Task<YardDto> CreateAsync(CreateYardRequestDto request, CancellationToken cancellationToken)
    {
        var yard = new Yard
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _yards.AddAsync(yard, cancellationToken);
        await _yards.SaveChangesAsync(cancellationToken);

        return _mapper.Map<YardDto>(yard);
    }

    public async Task<YardDto?> UpdateAsync(Guid id, UpdateYardRequestDto request, CancellationToken cancellationToken)
    {
        var yard = await _yards.GetByIdAsync(id, cancellationToken);
        if (yard is null)
        {
            return null;
        }

        yard.Name = request.Name.Trim();
        yard.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

        await _yards.SaveChangesAsync(cancellationToken);
        return _mapper.Map<YardDto>(yard);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var yard = await _yards.GetByIdAsync(id, cancellationToken);
        if (yard is null)
        {
            return false;
        }

        _yards.Remove(yard);
        await _yards.SaveChangesAsync(cancellationToken);
        return true;
    }
}
