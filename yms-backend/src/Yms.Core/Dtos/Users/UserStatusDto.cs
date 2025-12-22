using System.ComponentModel.DataAnnotations;

namespace Yms.Core.Dtos.Users;

/// <summary>
/// Data transfer object for updating user status
/// </summary>
public sealed record UserStatusDto
{
    /// <summary>
    /// Active status of the user
    /// </summary>
    [Required(ErrorMessage = "Active status is required")]
    public bool IsActive { get; init; }
}
