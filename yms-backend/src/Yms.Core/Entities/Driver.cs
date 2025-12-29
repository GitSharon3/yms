using Yms.Core.Common;

namespace Yms.Core.Entities;

public sealed class Driver : EntityBase
{
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string FullName => string.Join(" ", new[] { FirstName, LastName }.Where(x => !string.IsNullOrWhiteSpace(x)));
}
