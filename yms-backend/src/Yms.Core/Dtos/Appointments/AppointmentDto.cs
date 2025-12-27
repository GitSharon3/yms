using Yms.Core.Enums;

namespace Yms.Core.Dtos.Appointments;

public sealed record AppointmentHistoryItemDto(AppointmentStatus Status, DateTime AtUtc, string? Note);

public sealed record AppointmentDto(
    string Id,
    AppointmentStatus Status,
    DateTime ScheduledStartUtc,
    DateTime ScheduledEndUtc,
    string TruckId,
    string Driver,
    string Dock,
    string Location,
    string Type,
    string? Notes,
    List<AppointmentHistoryItemDto> History);
