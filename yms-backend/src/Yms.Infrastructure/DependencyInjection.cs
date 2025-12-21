using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Yms.Core.Interfaces;
using Yms.Infrastructure.Auth;
using Yms.Infrastructure.Data;
using Yms.Infrastructure.Repositories;

namespace Yms.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<YmsDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsql => npgsql.MigrationsAssembly("Yms.Infrastructure")));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IYardRepository, YardRepository>();
        services.AddScoped<IDashboardReadRepository, DashboardReadRepository>();

        services.AddSingleton<IPasswordHasher, PasswordHasherService>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        services.AddScoped<AdminSeeder>();

        return services;
    }
}
