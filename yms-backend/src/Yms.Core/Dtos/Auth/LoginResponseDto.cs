namespace Yms.Core.Dtos.Auth;

public sealed record LoginResponseDto(string AccessToken, DateTime ExpiresAtUtc, UserDto User);
