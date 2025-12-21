using Yms.Core.Entities;

namespace Yms.Core.Interfaces;

public interface IJwtTokenService
{
    (string token, DateTime expiresAtUtc) CreateToken(User user);
}
