using Yms.Core.Common;

namespace Yms.Core.Entities;

public sealed class YardSection : EntityBase
{
    public Guid YardId { get; set; }
    public Yard? Yard { get; set; }

    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }

    public List<Vehicle> Vehicles { get; set; } = new();
}
