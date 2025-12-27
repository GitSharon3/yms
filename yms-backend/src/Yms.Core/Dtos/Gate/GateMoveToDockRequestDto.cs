namespace Yms.Core.Dtos.Gate;

public sealed record GateMoveToDockRequestDto(
    string GateName,
    string VehicleNumber,
    string DockOrParking);
