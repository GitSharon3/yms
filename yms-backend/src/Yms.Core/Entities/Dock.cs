using Yms.Core.Common;
using Yms.Core.Enums;

namespace Yms.Core.Entities;

public sealed class Dock : EntityBase
{
    public Guid YardId { get; set; }
    public Yard? Yard { get; set; }

    public string Name { get; set; } = string.Empty;
    public DockStatus Status { get; set; } = DockStatus.Available;
}
