using AutoMapper;

using Yms.Core.Dtos.Auth;
using Yms.Core.Dtos.Yards;
using Yms.Core.Entities;

namespace Yms.Application.Mapping;

public sealed class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Yard, YardDto>();

        CreateMap<User, UserDto>()
            .ForCtorParam("Role", opt => opt.MapFrom(src => src.Role.ToString()));
    }
}
