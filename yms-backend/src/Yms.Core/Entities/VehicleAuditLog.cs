using Yms.Core.Common;
using Yms.Core.Enums;

namespace Yms.Core.Entities;

public sealed class VehicleAuditLog : EntityBase
{
    public Guid VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public Guid ActorUserId { get; set; }
    public string ActorRole { get; set; } = string.Empty;

    public string EventType { get; set; } = string.Empty;

    public VehicleStatus? FromStatus { get; set; }
    public VehicleStatus? ToStatus { get; set; }

    public bool? FromIsOnHold { get; set; }
    public bool? ToIsOnHold { get; set; }

    public Guid? FromDockId { get; set; }
    public Guid? ToDockId { get; set; }

    public Guid? FromYardSectionId { get; set; }
    public Guid? ToYardSectionId { get; set; }

    public string? DetailsJson { get; set; }

    public DateTime OccurredAtUtc { get; set; }
}
