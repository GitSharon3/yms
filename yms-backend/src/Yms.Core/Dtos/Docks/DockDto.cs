using Yms.Core.Enums;

namespace Yms.Core.Dtos.Docks;

public sealed record DockDto(Guid Id, Guid YardId, string Name, DockStatus Status, DateTime CreatedAtUtc);
