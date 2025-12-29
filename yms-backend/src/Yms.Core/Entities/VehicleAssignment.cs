using Yms.Core.Common;

namespace Yms.Core.Entities;

public sealed class VehicleAssignment : EntityBase
{
    public Guid VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string AssignmentRole { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime AssignedAtUtc { get; set; }
    public DateTime? UnassignedAtUtc { get; set; }
}
