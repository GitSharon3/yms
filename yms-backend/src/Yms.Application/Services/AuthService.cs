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

        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(password))
        {
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        var user = await _users.GetByIdentifierAsync(identifier, cancellationToken);
        if (user is null)
        {
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        var ok = _passwords.Verify(password, user.PasswordHash, user.PasswordSalt, user.PasswordIterations);
        if (!ok)
        {
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        var (token, expiresAtUtc) = _tokens.CreateToken(user);
        var dto = _mapper.Map<UserDto>(user);
        return new LoginResponseDto(token, expiresAtUtc, dto);
    }
}
