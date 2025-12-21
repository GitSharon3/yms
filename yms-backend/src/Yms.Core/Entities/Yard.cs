using Yms.Core.Common;

namespace Yms.Core.Entities;

public sealed class Yard : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }

    public List<YardSection> Sections { get; set; } = new();
    public List<Dock> Docks { get; set; } = new();
}
