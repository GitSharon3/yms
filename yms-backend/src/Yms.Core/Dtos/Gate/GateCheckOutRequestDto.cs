namespace Yms.Core.Dtos.Gate;

public sealed record GateCheckOutRequestDto(
    string GateName,
    string VehicleNumber,
    string? DriverName,
    string? TrailerNumber,
    string? SealNumber,
    string? DockOrParking);
