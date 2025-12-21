using Yms.Core.Entities;

namespace yms_backend.Repositories.Interfaces;

public interface IUserRepository : Yms.Core.Interfaces.IUserRepository
{
    Task<IEnumerable<User>> GetAllUsersAsync(int pageNumber = 1, int pageSize = 10, string? searchTerm = null, string? role = null, bool? isActive = null);
    Task<User> CreateUserAsync(User user);
    Task<User?> UpdateUserAsync(User user);
    Task<bool> UpdateUserStatusAsync(Guid id, bool isActive);
    Task<bool> UserExistsAsync(string username, string email);
    Task<int> GetTotalCountAsync(string? searchTerm = null, string? role = null, bool? isActive = null);
}
