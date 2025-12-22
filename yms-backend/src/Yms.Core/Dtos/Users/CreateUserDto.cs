using System.ComponentModel.DataAnnotations;

namespace Yms.Core.Dtos.Users;

/// <summary>
/// Data transfer object for creating a new user
/// </summary>
public sealed record CreateUserDto
{
    /// <summary>
    /// Full name of the user
    /// </summary>
    [Required(ErrorMessage = "Full name is required")]
    [MaxLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
    public string FullName { get; init; } = string.Empty;

    /// <summary>
    /// Email address of the user
    /// </summary>
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [MaxLength(254, ErrorMessage = "Email cannot exceed 254 characters")]
    public string Email { get; init; } = string.Empty;

    /// <summary>
    /// Username for login
    /// </summary>
    [Required(ErrorMessage = "Username is required")]
    [MaxLength(50, ErrorMessage = "Username cannot exceed 50 characters")]
    public string Username { get; init; } = string.Empty;

    /// <summary>
    /// Phone number
    /// </summary>
    [Required(ErrorMessage = "Phone number is required")]
    [MaxLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
    public string Phone { get; init; } = string.Empty;

    /// <summary>
    /// User role/permissions
    /// </summary>
    [Required(ErrorMessage = "Role is required")]
    public string Role { get; init; } = string.Empty;

    /// <summary>
    /// Initial password for the user
    /// </summary>
    [Required(ErrorMessage = "Password is required")]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters long")]
    public string Password { get; init; } = string.Empty;
}
