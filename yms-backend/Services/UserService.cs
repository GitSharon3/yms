using Yms.Core.Entities;
using yms_backend.Models.DTOs.User;
using yms_backend.Repositories.Interfaces;
using yms_backend.Services.Interfaces;
using yms_backend.Utils;

namespace yms_backend.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    private static UserDto ToDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Username = user.Username,
            Phone = user.Phone,
            Role = user.Role,
            IsActive = user.IsActive,
            LastLogin = user.LastLogin,
            CreatedAt = user.CreatedAtUtc,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<(IEnumerable<UserDto> users, int totalCount)> GetUsersAsync(
        int pageNumber = 1, 
        int pageSize = 10, 
        string? searchTerm = null, 
        string? role = null, 
        bool? isActive = null)
    {
        var users = await _userRepository.GetAllUsersAsync(pageNumber, pageSize, searchTerm, role, isActive);
        var totalCount = await _userRepository.GetTotalCountAsync(searchTerm, role, isActive);

        return (users.Select(u => ToDto(u)), totalCount);
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id, CancellationToken.None);
        return user == null ? null : ToDto(user);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserDto createUserDto)
    {
        var (passwordHash, salt, iterations) = PasswordHasher.HashPassword(createUserDto.Password);

        var user = new User
        {
            FullName = createUserDto.FullName.Trim(),
            Email = createUserDto.Email.Trim(),
            Username = createUserDto.Username.Trim(),
            Phone = createUserDto.Phone.Trim(),
            Role = createUserDto.Role.Trim(),
            IsActive = true
        };
        user.PasswordHash = passwordHash;
        user.PasswordSalt = salt;
        user.PasswordIterations = iterations;
        
        var createdUser = await _userRepository.CreateUserAsync(user);
        return ToDto(createdUser);
    }

    public async Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto)
    {
        var existingUser = await _userRepository.GetByIdAsync(id, CancellationToken.None);
        if (existingUser == null)
            return null;

        if (!string.IsNullOrWhiteSpace(updateUserDto.FullName))
            existingUser.FullName = updateUserDto.FullName.Trim();

        if (!string.IsNullOrWhiteSpace(updateUserDto.Email))
            existingUser.Email = updateUserDto.Email.Trim();

        if (!string.IsNullOrWhiteSpace(updateUserDto.Phone))
            existingUser.Phone = updateUserDto.Phone.Trim();

        if (!string.IsNullOrWhiteSpace(updateUserDto.Username))
            existingUser.Username = updateUserDto.Username.Trim();

        if (!string.IsNullOrWhiteSpace(updateUserDto.Role))
            existingUser.Role = updateUserDto.Role.Trim();
        
        // Update password if provided
        if (!string.IsNullOrEmpty(updateUserDto.Password))
        {
            var (passwordHash, salt, iterations) = PasswordHasher.HashPassword(updateUserDto.Password);
            existingUser.PasswordHash = passwordHash;
            existingUser.PasswordSalt = salt;
            existingUser.PasswordIterations = iterations;
        }
        
        existingUser.UpdatedAt = DateTime.UtcNow;
        
        var updatedUser = await _userRepository.UpdateUserAsync(existingUser);
        return updatedUser == null ? null : ToDto(updatedUser);
    }

    public async Task<bool> UpdateUserStatusAsync(Guid id, bool isActive)
    {
        return await _userRepository.UpdateUserStatusAsync(id, isActive);
    }

    public async Task<bool> IsUsernameOrEmailTakenAsync(string username, string email)
    {
        return await _userRepository.UserExistsAsync(username, email);
    }
}
