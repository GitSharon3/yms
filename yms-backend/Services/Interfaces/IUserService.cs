using yms_backend.Models;
using yms_backend.Models.DTOs.User;

namespace yms_backend.Services.Interfaces;

public interface IUserService
{
    Task<(IEnumerable<UserDto> users, int totalCount)> GetUsersAsync(int pageNumber = 1, int pageSize = 10, string? searchTerm = null, string? role = null, bool? isActive = null);
    Task<UserDto?> GetUserByIdAsync(Guid id);
    Task<UserDto> CreateUserAsync(CreateUserDto createUserDto);
    Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto);
    Task<bool> UpdateUserStatusAsync(Guid id, bool isActive);
    Task<bool> IsUsernameOrEmailTakenAsync(string username, string email);
}
