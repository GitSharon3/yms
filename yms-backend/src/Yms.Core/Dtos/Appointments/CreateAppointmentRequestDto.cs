using Yms.Core.Enums;

namespace Yms.Core.Dtos.Appointments;

public sealed record CreateAppointmentRequestDto(
    Guid YardId,
    Guid? DockId,
    Guid? VehicleId,
    DateTime ScheduledStartUtc,
    DateTime ScheduledEndUtc,
    string CargoType,
    AppointmentPriority Priority,
    string? Notes);
