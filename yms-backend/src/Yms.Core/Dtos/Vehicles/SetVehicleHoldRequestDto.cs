namespace Yms.Core.Dtos.Vehicles;

public sealed record SetVehicleHoldRequestDto(bool IsOnHold, string? HoldReason);
