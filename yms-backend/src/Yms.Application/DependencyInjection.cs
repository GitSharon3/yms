using AutoMapper;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

using Yms.Core.Interfaces;
using Yms.Application.Services;
using Yms.Application.Validation;

namespace Yms.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddAutoMapper(typeof(DependencyInjection).Assembly);

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IYardService, YardService>();
        services.AddScoped<IDashboardService, DashboardService>();

        return services;
    }
}
