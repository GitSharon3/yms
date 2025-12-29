namespace Yms.Core.Dtos.Vehicles;

public sealed record VehicleAuditLogDto(
    Guid Id,
    Guid VehicleId,
    Guid ActorUserId,
    string ActorRole,
    string EventType,
    string? FromStatus,
    string? ToStatus,
    bool? FromIsOnHold,
    bool? ToIsOnHold,
    Guid? FromDockId,
    Guid? ToDockId,
    Guid? FromYardSectionId,
    Guid? ToYardSectionId,
    string? DetailsJson,
    DateTime OccurredAtUtc);
