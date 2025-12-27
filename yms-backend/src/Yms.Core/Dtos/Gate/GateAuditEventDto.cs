namespace Yms.Core.Dtos.Gate;

public sealed record GateAuditEventDto(
    Guid Id,
    string Action,
    string Outcome,
    Guid ActorUserId,
    string ActorRole,
    string GateName,
    Guid? VehicleId,
    Guid? DriverId,
    string? TrailerNumber,
    string? SealNumber,
    string? DockOrParking,
    DateTime OccurredAtUtc);
