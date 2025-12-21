using System.Text;

using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using Yms.Application;
using Yms.Core.Settings;
using Yms.Infrastructure;
using Yms.Infrastructure.Auth;
using Yms.Infrastructure.Data;

using yms_backend.Infrastructure;
using yms_backend.Data;
using yms_backend.Repositories;
using yms_backend.Repositories.Interfaces;
using yms_backend.Services;
using yms_backend.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "YMS API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<AdminSeedSettings>(builder.Configuration.GetSection("AdminSeed"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithOrigins("http://localhost:5173");
    });
});

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

builder.Services.AddDbContext<yms_backend.Data.YmsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<yms_backend.Repositories.Interfaces.IUserRepository, yms_backend.Repositories.UserRepository>();
builder.Services.AddScoped<yms_backend.Services.Interfaces.IUserService, yms_backend.Services.UserService>();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
if (string.IsNullOrWhiteSpace(jwt.SigningKey) || jwt.SigningKey.Length < 32)
{
    throw new InvalidOperationException("JWT SigningKey must be set to a long random secret (at least 32 characters). Update appsettings.json -> Jwt:SigningKey.");
}
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseMiddleware<ApiExceptionMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("DevCors");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Yms.Infrastructure.Data.YmsDbContext>();
    var userDb = scope.ServiceProvider.GetRequiredService<yms_backend.Data.YmsDbContext>();
    if (app.Environment.IsDevelopment())
    {
        var dropLegacy = app.Configuration.GetValue<bool>("Database:DropLegacyTablesOnStartup");
        if (dropLegacy)
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS public.\"Yards\" CASCADE;", CancellationToken.None);
        }

        await db.Database.MigrateAsync(CancellationToken.None);
        try
        {
            await userDb.Database.MigrateAsync(CancellationToken.None);
        }
        catch
        {
            await userDb.Database.EnsureCreatedAsync(CancellationToken.None);
        }
    }

    var seeder = scope.ServiceProvider.GetRequiredService<AdminSeeder>();
    await seeder.EnsureSeededAsync(CancellationToken.None);
}

app.Run();
