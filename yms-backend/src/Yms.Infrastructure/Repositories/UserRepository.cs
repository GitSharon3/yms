using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Yms.Core.Entities;
using Yms.Core.Interfaces;
using Yms.Infrastructure.Data;

namespace Yms.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for user data access operations
/// </summary>
public sealed class UserRepository : IUserRepository
{
    private readonly YmsDbContext _db;
    private readonly ILogger<UserRepository> _logger;

    public UserRepository(YmsDbContext db, ILogger<UserRepository> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets a user by their identifier (username or email)
    /// </summary>
    public async Task<User?> GetByIdentifierAsync(string identifier, CancellationToken cancellationToken)
    {
        try
        {
            var trimmed = identifier.Trim();
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return null;
            }

            var email = trimmed.Contains('@') ? trimmed.ToLowerInvariant() : null;
            var user = await _db.Users
                .FirstOrDefaultAsync(x => x.Username == trimmed || (email != null && x.Email == email), cancellationToken);

            _logger.LogDebug("Retrieved user by identifier '{Identifier}': {Found}", identifier, user != null);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by identifier: {Identifier}", identifier);
            throw;
        }
    }

    /// <summary>
    /// Gets a user by their unique ID
    /// </summary>
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            _logger.LogDebug("Retrieved user by ID {UserId}: {Found}", id, user != null);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by ID: {UserId}", id);
            throw;
        }
    }

    /// <summary>
    /// Gets a paginated list of users with optional filtering
    /// </summary>
    public async Task<IEnumerable<User>> GetAllUsersAsync(
        int pageNumber, 
        int pageSize, 
        string? searchTerm = null, 
        string? role = null, 
        bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _db.Users.AsQueryable();

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim();
                query = query.Where(u => 
                    u.FullName.Contains(term) || 
                    u.Username.Contains(term) || 
                    u.Email.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                query = query.Where(u => u.Role == role.Trim());
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            // Apply pagination and ordering
            var users = await query
                .OrderBy(u => u.Username)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            _logger.LogDebug("Retrieved {Count} users for page {PageNumber}, size {PageSize}", users.Count, pageNumber, pageSize);
            return users;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users with filters - Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);
            throw;
        }
    }

    /// <summary>
    /// Gets the total count of users with optional filtering
    /// </summary>
    public async Task<int> GetTotalCountAsync(
        string? searchTerm = null, 
        string? role = null, 
        bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _db.Users.AsQueryable();

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim();
                query = query.Where(u => 
                    u.FullName.Contains(term) || 
                    u.Username.Contains(term) || 
                    u.Email.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                query = query.Where(u => u.Role == role.Trim());
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);
            _logger.LogDebug("Total users count: {Total}", totalCount);
            return totalCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting total users count");
            throw;
        }
    }

    /// <summary>
    /// Creates a new user
    /// </summary>
    public async Task<User> CreateUserAsync(User user, CancellationToken cancellationToken)
    {
        try
        {
            await _db.Users.AddAsync(user, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created new user with ID: {UserId}", user.Id);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user with username: {Username}", user.Username);
            throw;
        }
    }

    /// <summary>
    /// Updates an existing user
    /// </summary>
    public async Task<User?> UpdateUserAsync(User user, CancellationToken cancellationToken)
    {
        try
        {
            var existingUser = await _db.Users.FirstOrDefaultAsync(x => x.Id == user.Id, cancellationToken);
            if (existingUser == null)
            {
                return null;
            }

            // Update properties
            existingUser.FullName = user.FullName;
            existingUser.Email = user.Email;
            existingUser.Username = user.Username;
            existingUser.Phone = user.Phone;
            existingUser.Role = user.Role;
            existingUser.IsActive = user.IsActive;
            existingUser.LastLogin = user.LastLogin;
            existingUser.PasswordHash = user.PasswordHash;
            existingUser.PasswordSalt = user.PasswordSalt;
            existingUser.PasswordIterations = user.PasswordIterations;
            existingUser.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Updated user with ID: {UserId}", user.Id);
            return existingUser;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user with ID: {UserId}", user.Id);
            throw;
        }
    }

    /// <summary>
    /// Updates a user's active status
    /// </summary>
    public async Task<bool> UpdateUserStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (user == null)
            {
                return false;
            }

            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Updated status for user with ID: {UserId} to {IsActive}", id, isActive);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating status for user with ID: {UserId}", id);
            throw;
        }
    }

    /// <summary>
    /// Checks if a username or email already exists
    /// </summary>
    public async Task<bool> UserExistsAsync(string username, string email, CancellationToken cancellationToken)
    {
        try
        {
            var normalizedUsername = username.Trim().ToLowerInvariant();
            var normalizedEmail = email.Trim().ToLowerInvariant();

            var exists = await _db.Users
                .AnyAsync(u => u.Username.ToLower() == normalizedUsername || u.Email.ToLower() == normalizedEmail, cancellationToken);

            _logger.LogDebug("User exists check for username '{Username}' or email '{Email}': {Exists}", username, email, exists);
            return exists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user exists for username '{Username}' or email '{Email}'", username, email);
            throw;
        }
    }

    /// <summary>
    /// Checks if a username is taken by another user
    /// </summary>
    public async Task<bool> IsUsernameTakenAsync(string username, Guid excludeUserId, CancellationToken cancellationToken)
    {
        try
        {
            var normalizedUsername = username.Trim().ToLowerInvariant();
            var isTaken = await _db.Users
                .AnyAsync(u => u.Username.ToLower() == normalizedUsername && u.Id != excludeUserId, cancellationToken);

            _logger.LogDebug("Username '{Username}' taken by another user (excluding {UserId}): {Taken}", username, excludeUserId, isTaken);
            return isTaken;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if username '{Username}' is taken by another user", username);
            throw;
        }
    }

    /// <summary>
    /// Checks if an email is taken by another user
    /// </summary>
    public async Task<bool> IsEmailTakenAsync(string email, Guid excludeUserId, CancellationToken cancellationToken)
    {
        try
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            var isTaken = await _db.Users
                .AnyAsync(u => u.Email.ToLower() == normalizedEmail && u.Id != excludeUserId, cancellationToken);

            _logger.LogDebug("Email '{Email}' taken by another user (excluding {UserId}): {Taken}", email, excludeUserId, isTaken);
            return isTaken;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if email '{Email}' is taken by another user", email);
            throw;
        }
    }

    /// <summary>
    /// Adds a user to the context (legacy method for compatibility)
    /// </summary>
    public async Task AddAsync(User user, CancellationToken cancellationToken)
    {
        try
        {
            await _db.Users.AddAsync(user, cancellationToken);
            _logger.LogDebug("Added user to context: {UserId}", user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding user to context: {UserId}", user.Id);
            throw;
        }
    }

    /// <summary>
    /// Saves changes to the database (legacy method for compatibility)
    /// </summary>
    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            _logger.LogDebug("Saved changes to database");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving changes to database");
            throw;
        }
    }
}
