namespace Yms.Core.Dtos.Vehicles;

public sealed record UpdateVehicleLocationRequestDto(Guid? YardSectionId, Guid? DockId);
