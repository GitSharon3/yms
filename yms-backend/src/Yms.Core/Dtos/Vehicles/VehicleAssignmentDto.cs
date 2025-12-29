namespace Yms.Core.Dtos.Vehicles;

public sealed record VehicleAssignmentDto(
    Guid Id,
    Guid VehicleId,
    Guid UserId,
    string Username,
    string AssignmentRole,
    bool IsActive,
    DateTime AssignedAtUtc,
    DateTime? UnassignedAtUtc);
