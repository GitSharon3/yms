using System.ComponentModel.DataAnnotations;

namespace yms_backend.Models;

public sealed class AdminUser
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public byte[] PasswordHash { get; set; } = Array.Empty<byte>();

    [Required]
    public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();

    public int PasswordIterations { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
