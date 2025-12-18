using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using yms_backend.Auth;
using yms_backend.Data;

namespace yms_backend.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly YmsDbContext _db;
    private readonly JwtTokenService _tokens;

    public AuthController(YmsDbContext db, JwtTokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    public sealed record LoginRequest(string Identifier, string Password);

    public sealed record LoginResponse(string AccessToken, DateTime ExpiresAtUtc, AdminDto Admin);

    public sealed record AdminDto(Guid Id, string Email, string Username);

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var identifier = request.Identifier?.Trim();
        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var normalizedEmail = identifier.Contains('@') ? identifier.ToLowerInvariant() : null;

        var admin = await _db.AdminUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Username == identifier || (normalizedEmail != null && x.Email == normalizedEmail),
                cancellationToken);

        if (admin is null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var ok = PasswordHasher.Verify(request.Password, admin.PasswordHash, admin.PasswordSalt, admin.PasswordIterations);
        if (!ok)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var (token, expires) = _tokens.CreateAdminToken(admin);
        return Ok(new LoginResponse(token, expires, new AdminDto(admin.Id, admin.Email, admin.Username)));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("me")]
    public ActionResult<AdminDto> Me()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        _ = Guid.TryParse(sub, out var id);

        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
        var username = User.Identity?.Name ?? string.Empty;

        return Ok(new AdminDto(id, email, username));
    }
}
