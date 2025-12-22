using AutoMapper;

using Yms.Core.Dtos.Auth;
using Yms.Core.Dtos.Users;
using Yms.Core.Dtos.Yards;
using Yms.Core.Entities;

namespace Yms.Application.Mapping;

/// <summary>
/// AutoMapper profile for mapping entities to DTOs and vice versa
/// </summary>
public sealed class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Yard mappings
        CreateMap<Yard, YardDto>();

        // User mappings
        CreateMap<User, Yms.Core.Dtos.Auth.UserDto>();

        CreateMap<User, Yms.Core.Dtos.Users.UserDto>()
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAtUtc))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => src.UpdatedAt));
    }
}
