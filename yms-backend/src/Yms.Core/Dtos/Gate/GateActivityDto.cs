using Yms.Core.Enums;

namespace Yms.Core.Dtos.Gate;

public sealed record GateActivityDto(
    Guid Id,
    GateActivityType Type,
    string GateName,
    Guid? VehicleId,
    string? VehicleNumber,
    Guid? DriverId,
    string? DriverName,
    DateTime OccurredAtUtc);
