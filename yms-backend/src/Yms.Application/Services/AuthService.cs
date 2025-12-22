using AutoMapper;

using Yms.Core.Dtos.Auth;
using Yms.Core.Interfaces;

namespace Yms.Application.Services;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwords;
    private readonly IJwtTokenService _tokens;
    private readonly IMapper _mapper;

    public AuthService(IUserRepository users, IPasswordHasher passwords, IJwtTokenService tokens, IMapper mapper)
    {
        _users = users;
        _passwords = passwords;
        _tokens = tokens;
        _mapper = mapper;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken)
    {
        var identifier = request.Identifier?.Trim() ?? string.Empty;
        var password = request.Password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(identifier))
        {
            throw new ArgumentException("Email or username is required.", nameof(request.Identifier));
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException("Password is required.", nameof(request.Password));
        }

        if (password.Length < 6)
        {
            throw new ArgumentException("Password must be at least 6 characters long.", nameof(request.Password));
        }

        if (identifier.Length > 254)
        {
            throw new ArgumentException("Email or username cannot exceed 254 characters.", nameof(request.Identifier));
        }

        if (password.Length > 200)
        {
            throw new ArgumentException("Password cannot exceed 200 characters.", nameof(request.Password));
        }

        // Email format validation if it looks like an email
        if (identifier.Contains('@') && !IsValidEmail(identifier))
        {
            throw new ArgumentException("Please enter a valid email address.", nameof(request.Identifier));
        }

        var user = await _users.GetByIdentifierAsync(identifier, cancellationToken);
        if (user is null)
        {
            throw new UnauthorizedAccessException("Invalid email/username or password.");
        }

        var ok = _passwords.Verify(password, user.PasswordHash, user.PasswordSalt, user.PasswordIterations);
        if (!ok)
        {
            throw new UnauthorizedAccessException("Invalid email/username or password.");
        }

        var (token, expiresAtUtc) = _tokens.CreateToken(user);
        var dto = _mapper.Map<UserDto>(user);
        return new LoginResponseDto(token, expiresAtUtc, dto);
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
