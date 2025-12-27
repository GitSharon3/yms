using System;
using System.Linq;

using AutoMapper;
using Microsoft.Extensions.Logging;
using Yms.Core.Dtos.Users;
using Yms.Core.Entities;
using Yms.Core.Enums;
using Yms.Core.Interfaces;

namespace Yms.Application.Services;

/// <summary>
/// Service for managing user operations and business logic
/// </summary>
public sealed class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IMapper _mapper;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IMapper mapper,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    private static string NormalizeRoleKey(string value)
    {
        var chars = value.Where(char.IsLetterOrDigit).ToArray();
        return new string(chars).ToLowerInvariant();
    }

    private static string NormalizeRole(string role)
    {
        var trimmed = role?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new ArgumentException("Role is required");
        }

        var key = NormalizeRoleKey(trimmed);
        foreach (var name in Enum.GetNames(typeof(UserRole)))
        {
            if (NormalizeRoleKey(name) == key)
            {
                return name;
            }
        }

        throw new ArgumentException($"Invalid role '{role}'.");
    }

    /// <summary>
    /// Gets a paginated list of users with optional filtering
    /// </summary>
    public async Task<(IEnumerable<Yms.Core.Dtos.Users.UserDto> users, int totalCount)> GetUsersAsync(
        int pageNumber = 1, 
        int pageSize = 10, 
        string? searchTerm = null, 
        string? role = null, 
        bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Getting users with page {PageNumber}, size {PageSize}", pageNumber, pageSize);

            var normalizedRole = string.IsNullOrWhiteSpace(role) ? null : NormalizeRole(role);

            var users = await _userRepository.GetAllUsersAsync(pageNumber, pageSize, searchTerm, normalizedRole, isActive, cancellationToken);
            var totalCount = await _userRepository.GetTotalCountAsync(searchTerm, normalizedRole, isActive, cancellationToken);

            var userDtos = _mapper.Map<IEnumerable<Yms.Core.Dtos.Users.UserDto>>(users);

            _logger.LogInformation("Retrieved {Count} users out of {Total}", userDtos.Count(), totalCount);
            return (userDtos, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving users");
            throw;
        }
    }

    public async Task<bool> DeleteUserAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Deleting user with ID: {UserId}", id);
            var ok = await _userRepository.DeleteUserAsync(id, cancellationToken);

            if (ok)
            {
                _logger.LogInformation("Successfully deleted user with ID: {UserId}", id);
            }
            else
            {
                _logger.LogWarning("Failed to delete user with ID: {UserId} - user not found", id);
            }

            return ok;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting user with ID: {UserId}", id);
            throw;
        }
    }

    /// <summary>
    /// Gets a user by their unique identifier
    /// </summary>
    public async Task<Yms.Core.Dtos.Users.UserDto?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Getting user with ID: {UserId}", id);

            var user = await _userRepository.GetByIdAsync(id, cancellationToken);
            if (user == null)
            {
                _logger.LogWarning("User with ID {UserId} not found", id);
                return null;
            }

            var userDto = _mapper.Map<Yms.Core.Dtos.Users.UserDto>(user);
            _logger.LogInformation("Successfully retrieved user with ID: {UserId}", id);
            return userDto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting user with ID: {UserId}", id);
            throw;
        }
    }

    /// <summary>
    /// Creates a new user with hashed password
    /// </summary>
    public async Task<Yms.Core.Dtos.Users.UserDto> CreateUserAsync(CreateUserDto createUserDto, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Creating new user with username: {Username}", createUserDto.Username);

            // Check if username or email already exists
            if (await IsUsernameOrEmailTakenAsync(createUserDto.Username, createUserDto.Email, cancellationToken))
            {
                throw new InvalidOperationException("Username or email already exists");
            }

            // Hash the password
            var (passwordHash, salt, iterations) = _passwordHasher.HashPassword(createUserDto.Password);

            // Create user entity
            var user = new User
            {
                FullName = createUserDto.FullName.Trim(),
                Email = createUserDto.Email.Trim(),
                Username = createUserDto.Username.Trim(),
                Phone = createUserDto.Phone.Trim(),
                Role = NormalizeRole(createUserDto.Role),
                IsActive = true,
                PasswordHash = passwordHash,
                PasswordSalt = salt,
                PasswordIterations = iterations
            };

            var createdUser = await _userRepository.CreateUserAsync(user, cancellationToken);
            var userDto = _mapper.Map<Yms.Core.Dtos.Users.UserDto>(createdUser);

            _logger.LogInformation("Successfully created user with ID: {UserId}", createdUser.Id);
            return userDto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating user with username: {Username}", createUserDto.Username);
            throw;
        }
    }

    /// <summary>
    /// Updates an existing user
    /// </summary>
    public async Task<Yms.Core.Dtos.Users.UserDto?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Updating user with ID: {UserId}", id);

            var existingUser = await _userRepository.GetByIdAsync(id, cancellationToken);
            if (existingUser == null)
            {
                _logger.LogWarning("User with ID {UserId} not found for update", id);
                return null;
            }

            // Update properties if provided
            if (!string.IsNullOrWhiteSpace(updateUserDto.FullName))
                existingUser.FullName = updateUserDto.FullName.Trim();

            if (!string.IsNullOrWhiteSpace(updateUserDto.Email))
            {
                // Check if email is taken by another user
                var emailTaken = await _userRepository.IsEmailTakenAsync(updateUserDto.Email, id, cancellationToken);
                if (emailTaken)
                    throw new InvalidOperationException("Email is already taken by another user");

                existingUser.Email = updateUserDto.Email.Trim();
            }

            if (!string.IsNullOrWhiteSpace(updateUserDto.Phone))
                existingUser.Phone = updateUserDto.Phone.Trim();

            if (!string.IsNullOrWhiteSpace(updateUserDto.Username))
            {
                // Check if username is taken by another user
                var usernameTaken = await _userRepository.IsUsernameTakenAsync(updateUserDto.Username, id, cancellationToken);
                if (usernameTaken)
                    throw new InvalidOperationException("Username is already taken by another user");

                existingUser.Username = updateUserDto.Username.Trim();
            }

            if (!string.IsNullOrWhiteSpace(updateUserDto.Role))
                existingUser.Role = NormalizeRole(updateUserDto.Role);

            // Update password if provided
            if (!string.IsNullOrEmpty(updateUserDto.Password))
            {
                var (passwordHash, salt, iterations) = _passwordHasher.HashPassword(updateUserDto.Password);
                existingUser.PasswordHash = passwordHash;
                existingUser.PasswordSalt = salt;
                existingUser.PasswordIterations = iterations;
            }

            existingUser.UpdatedAt = DateTime.UtcNow;

            var updatedUser = await _userRepository.UpdateUserAsync(existingUser, cancellationToken);
            if (updatedUser is null)
            {
                _logger.LogWarning("UpdateUserAsync returned null for user with ID: {UserId}", id);
                throw new InvalidOperationException("Failed to update user");
            }

            var userDto = _mapper.Map<Yms.Core.Dtos.Users.UserDto>(updatedUser);

            _logger.LogInformation("Successfully updated user with ID: {UserId}", updatedUser.Id);
            return userDto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating user with ID: {UserId}", id);
            throw;
        }
    }

    /// <summary>
    /// Updates a user's active status
    /// </summary>
    public async Task<bool> UpdateUserStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Updating status for user with ID: {UserId} to {IsActive}", id, isActive);

            var success = await _userRepository.UpdateUserStatusAsync(id, isActive, cancellationToken);
            
            if (success)
            {
                _logger.LogInformation("Successfully updated status for user with ID: {UserId}", id);
            }
            else
            {
                _logger.LogWarning("Failed to update status for user with ID: {UserId} - user not found", id);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating status for user with ID: {UserId}", id);
            throw;
        }
    }

    /// <summary>
    /// Checks if a username or email is already taken
    /// </summary>
    public async Task<bool> IsUsernameOrEmailTakenAsync(string username, string email, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Checking if username '{Username}' or email '{Email}' is taken", username, email);

            var isTaken = await _userRepository.UserExistsAsync(username, email, cancellationToken);
            
            _logger.LogDebug("Username '{Username}' or email '{Email}' is {Taken}", 
                username, email, isTaken ? "taken" : "available");

            return isTaken;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while checking if username '{Username}' or email '{Email}' is taken", username, email);
            throw;
        }
    }
}
