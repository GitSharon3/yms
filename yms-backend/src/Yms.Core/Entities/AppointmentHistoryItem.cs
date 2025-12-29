using Yms.Core.Common;
using Yms.Core.Enums;

namespace Yms.Core.Entities;

public sealed class AppointmentHistoryItem : EntityBase
{
    public Guid AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public AppointmentStatus Status { get; set; }
    public DateTime AtUtc { get; set; }
    public string? Note { get; set; }
}
