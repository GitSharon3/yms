using System.ComponentModel.DataAnnotations;

namespace Yms.Core.Dtos.Users;

/// <summary>
/// Data transfer object for updating an existing user
/// </summary>
public sealed record UpdateUserDto
{
    /// <summary>
    /// Full name of the user (optional)
    /// </summary>
    [MaxLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
    public string? FullName { get; init; }

    /// <summary>
    /// Email address of the user (optional)
    /// </summary>
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [MaxLength(254, ErrorMessage = "Email cannot exceed 254 characters")]
    public string? Email { get; init; }

    /// <summary>
    /// Username for login (optional)
    /// </summary>
    [MaxLength(50, ErrorMessage = "Username cannot exceed 50 characters")]
    public string? Username { get; init; }

    /// <summary>
    /// Phone number (optional)
    /// </summary>
    [MaxLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
    public string? Phone { get; init; }

    /// <summary>
    /// User role/permissions (optional)
    /// </summary>
    public string? Role { get; init; }

    /// <summary>
    /// New password (optional - if provided, will update password)
    /// </summary>
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters long")]
    public string? Password { get; init; }
}
