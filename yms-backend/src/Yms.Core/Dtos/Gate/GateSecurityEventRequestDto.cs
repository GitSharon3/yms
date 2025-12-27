namespace Yms.Core.Dtos.Gate;

public sealed record GateSecurityEventRequestDto(
    string GateName,
    string VehicleNumber,
    string? DriverName,
    string EventType,
    string Severity,
    string? Note,
    string? TrailerNumber,
    string? SealNumber);
