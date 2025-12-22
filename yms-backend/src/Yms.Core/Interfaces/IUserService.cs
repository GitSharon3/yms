using Yms.Core.Dtos.Auth;
using Yms.Core.Dtos.Users;

namespace Yms.Core.Interfaces;

/// <summary>
/// Service interface for user management operations
/// </summary>
public interface IUserService
{
    /// <summary>
    /// Gets a paginated list of users with optional filtering
    /// </summary>
    Task<(IEnumerable<Yms.Core.Dtos.Users.UserDto> users, int totalCount)> GetUsersAsync(
        int pageNumber = 1, 
        int pageSize = 10, 
        string? searchTerm = null, 
        string? role = null, 
        bool? isActive = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a user by their unique identifier
    /// </summary>
    Task<Yms.Core.Dtos.Users.UserDto?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new user
    /// </summary>
    Task<Yms.Core.Dtos.Users.UserDto> CreateUserAsync(CreateUserDto createUserDto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing user
    /// </summary>
    Task<Yms.Core.Dtos.Users.UserDto?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates a user's active status
    /// </summary>
    Task<bool> UpdateUserStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);

    Task<bool> DeleteUserAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a username or email is already taken
    /// </summary>
    Task<bool> IsUsernameOrEmailTakenAsync(string username, string email, CancellationToken cancellationToken = default);
}
