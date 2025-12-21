namespace Yms.Core.Dtos.Yards;

public sealed record YardDto(Guid Id, string Name, string? Address, DateTime CreatedAtUtc);
