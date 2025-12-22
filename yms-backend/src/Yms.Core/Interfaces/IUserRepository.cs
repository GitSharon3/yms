using Yms.Core.Entities;

namespace Yms.Core.Interfaces;

/// <summary>
/// Repository interface for user data access operations
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Gets a user by their identifier (username or email)
    /// </summary>
    Task<User?> GetByIdentifierAsync(string identifier, CancellationToken cancellationToken);

    /// <summary>
    /// Gets a user by their unique ID
    /// </summary>
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Gets a paginated list of users with optional filtering
    /// </summary>
    Task<IEnumerable<User>> GetAllUsersAsync(
        int pageNumber, 
        int pageSize, 
        string? searchTerm = null, 
        string? role = null, 
        bool? isActive = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total count of users with optional filtering
    /// </summary>
    Task<int> GetTotalCountAsync(
        string? searchTerm = null, 
        string? role = null, 
        bool? isActive = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new user
    /// </summary>
    Task<User> CreateUserAsync(User user, CancellationToken cancellationToken);

    /// <summary>
    /// Updates an existing user
    /// </summary>
    Task<User?> UpdateUserAsync(User user, CancellationToken cancellationToken);

    /// <summary>
    /// Updates a user's active status
    /// </summary>
    Task<bool> UpdateUserStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);

    /// <summary>
    /// Checks if a username or email already exists
    /// </summary>
    Task<bool> UserExistsAsync(string username, string email, CancellationToken cancellationToken);

    /// <summary>
    /// Checks if a username is taken by another user
    /// </summary>
    Task<bool> IsUsernameTakenAsync(string username, Guid excludeUserId, CancellationToken cancellationToken);

    /// <summary>
    /// Checks if an email is taken by another user
    /// </summary>
    Task<bool> IsEmailTakenAsync(string email, Guid excludeUserId, CancellationToken cancellationToken);

    /// <summary>
    /// Adds a user to the context (legacy method for compatibility)
    /// </summary>
    Task AddAsync(User user, CancellationToken cancellationToken);

    /// <summary>
    /// Saves changes to the database (legacy method for compatibility)
    /// </summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
