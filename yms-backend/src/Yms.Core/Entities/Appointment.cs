using Yms.Core.Common;
using Yms.Core.Enums;

namespace Yms.Core.Entities;

public sealed class Appointment : EntityBase
{
    public string Code { get; set; } = string.Empty;

    public Guid YardId { get; set; }
    public Yard? Yard { get; set; }

    public Guid? DockId { get; set; }
    public Dock? Dock { get; set; }

    public Guid? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public string CargoType { get; set; } = string.Empty;
    public AppointmentPriority Priority { get; set; } = AppointmentPriority.Normal;
    public string? Notes { get; set; }

    public DateTime ScheduledStartUtc { get; set; }
    public DateTime ScheduledEndUtc { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;

    public List<AppointmentHistoryItem> History { get; set; } = new();
}
