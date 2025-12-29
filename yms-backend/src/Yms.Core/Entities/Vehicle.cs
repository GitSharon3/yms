using Yms.Core.Common;
using Yms.Core.Enums;

namespace Yms.Core.Entities;

public sealed class Vehicle : EntityBase
{
    public string VehicleNumber { get; set; } = string.Empty;
    public string? TrailerNumber { get; set; }
    public VehicleType Type { get; set; }
    public VehicleStatus Status { get; set; }

    public bool IsOnHold { get; set; }
    public string? HoldReason { get; set; }

    public Guid? YardSectionId { get; set; }
    public YardSection? YardSection { get; set; }

    public Guid? DockId { get; set; }
    public Dock? Dock { get; set; }

    public Guid? DriverId { get; set; }
    public Driver? Driver { get; set; }
}
