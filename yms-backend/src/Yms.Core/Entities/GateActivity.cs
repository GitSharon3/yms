using Yms.Core.Common;
using Yms.Core.Enums;

namespace Yms.Core.Entities;

public sealed class GateActivity : EntityBase
{
    public GateActivityType Type { get; set; }

    public string GateName { get; set; } = string.Empty;

    public Guid? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public Guid? DriverId { get; set; }
    public Driver? Driver { get; set; }

    public DateTime OccurredAtUtc { get; set; }
}
