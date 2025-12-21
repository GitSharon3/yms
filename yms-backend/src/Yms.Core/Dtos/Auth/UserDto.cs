namespace Yms.Core.Dtos.Auth;

public sealed record UserDto(Guid Id, string Email, string Username, string Role);
