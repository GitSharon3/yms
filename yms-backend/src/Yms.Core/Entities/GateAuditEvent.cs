using Yms.Core.Common;

namespace Yms.Core.Entities;

public sealed class GateAuditEvent : EntityBase
{
    public string Action { get; set; } = string.Empty;
    public string Outcome { get; set; } = string.Empty;

    public Guid ActorUserId { get; set; }
    public string ActorRole { get; set; } = string.Empty;

    public string GateName { get; set; } = string.Empty;

    public Guid? VehicleId { get; set; }
    public Guid? DriverId { get; set; }

    public string? TrailerNumber { get; set; }
    public string? SealNumber { get; set; }

    public string? DockOrParking { get; set; }

    public string? DetailsJson { get; set; }

    public DateTime OccurredAtUtc { get; set; }
}
