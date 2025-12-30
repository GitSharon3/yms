namespace Yms.Core.Dtos.Vehicles;

public sealed record VehicleDto(
    Guid Id,
    string VehicleNumber,
    string? LicensePlate,
    string? TrailerNumber,
    string Type,
    string Status,
    bool IsOnHold,
    string? HoldReason,
    Guid? NextAppointmentId,
    DateTime? NextAppointmentStartUtc,
    DateTime? NextAppointmentEndUtc,
    string? NextAppointmentPriority,
    string? NextAppointmentStatus,
    Guid? YardSectionId,
    string? YardSectionName,
    Guid? DockId,
    string? DockName,
    Guid? DriverId,
    string? DriverName,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAt);
