namespace Yms.Core.Dtos.Gate;

public sealed record GateActionResultDto(
    string Message,
    Guid? VehicleId,
    Guid? DriverId,
    DateTime OccurredAtUtc);
