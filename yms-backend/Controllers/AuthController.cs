using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Yms.Core.Enums;
using Yms.Core.Dtos.Auth;
using Yms.Core.Interfaces;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IValidator<LoginRequestDto> _validator;

    public AuthController(IAuthService auth, IValidator<LoginRequestDto> validator)
    {
        _auth = auth ?? throw new ArgumentNullException(nameof(auth));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return BadRequest(new { message = string.Join(" ", validationResult.Errors.Select(e => e.ErrorMessage)) });
        }

        try
        {
            var dto = await _auth.LoginAsync(request, cancellationToken);
            return Ok(dto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<UserDto> Me()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        _ = Guid.TryParse(sub, out var id);

        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
        var username = User.Identity?.Name ?? string.Empty;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        return Ok(new UserDto(id, email, username, role));
    }
}
