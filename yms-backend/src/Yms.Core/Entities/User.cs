using Yms.Core.Common;
using Yms.Core.Enums;

namespace Yms.Core.Entities;

public sealed class User : EntityBase
{
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;

    public byte[] PasswordHash { get; set; } = Array.Empty<byte>();
    public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();
    public int PasswordIterations { get; set; }

    public UserRole Role { get; set; } = UserRole.Admin;
}
