namespace Yms.Core.Dtos.Gate;

public sealed record GateCheckInRequestDto(
    string GateName,
    string VehicleNumber,
    string? DriverName,
    string? TrailerNumber,
    string? SealNumber,
    string? DockOrParking);
