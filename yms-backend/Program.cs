using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using static Yms.Application.DependencyInjection;
using Yms.Infrastructure;
using Yms.Infrastructure.Auth;
using Yms.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithOrigins("http://localhost:5173", "http://localhost:3000")
            .AllowCredentials()
            .WithExposedHeaders("X-Total-Count", "X-Page", "X-Page-Size", "X-Total-Pages");
    });
});

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

builder.Services.Configure<Yms.Core.Settings.JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<Yms.Core.Settings.AdminSeedSettings>(builder.Configuration.GetSection("AdminSeed"));

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

builder.Services.AddDbContext<YmsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwt = builder.Configuration.GetSection("Jwt").Get<Yms.Core.Settings.JwtSettings>() ?? new Yms.Core.Settings.JwtSettings();
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

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("gate.view", policy =>
        policy.RequireRole(
            nameof(Yms.Core.Enums.UserRole.Admin),
            nameof(Yms.Core.Enums.UserRole.YardManager),
            nameof(Yms.Core.Enums.UserRole.GateSecurity),
            nameof(Yms.Core.Enums.UserRole.YardJockey),
            nameof(Yms.Core.Enums.UserRole.Operator),
            nameof(Yms.Core.Enums.UserRole.ViewOnly),
            nameof(Yms.Core.Enums.UserRole.Driver)));

    options.AddPolicy("gate.check_in", policy =>
        policy.RequireRole(
            nameof(Yms.Core.Enums.UserRole.Admin),
            nameof(Yms.Core.Enums.UserRole.YardManager),
            nameof(Yms.Core.Enums.UserRole.GateSecurity),
            nameof(Yms.Core.Enums.UserRole.Driver)));

    options.AddPolicy("gate.check_out", policy =>
        policy.RequireRole(
            nameof(Yms.Core.Enums.UserRole.Admin),
            nameof(Yms.Core.Enums.UserRole.YardManager),
            nameof(Yms.Core.Enums.UserRole.GateSecurity),
            nameof(Yms.Core.Enums.UserRole.Driver)));

    options.AddPolicy("gate.move_to_dock", policy =>
        policy.RequireRole(
            nameof(Yms.Core.Enums.UserRole.Admin),
            nameof(Yms.Core.Enums.UserRole.YardManager),
            nameof(Yms.Core.Enums.UserRole.GateSecurity),
            nameof(Yms.Core.Enums.UserRole.YardJockey),
            nameof(Yms.Core.Enums.UserRole.Operator)));

    options.AddPolicy("gate.security_event", policy =>
        policy.RequireRole(
            nameof(Yms.Core.Enums.UserRole.Admin),
            nameof(Yms.Core.Enums.UserRole.GateSecurity)));

    options.AddPolicy("gate.audit_view", policy =>
        policy.RequireRole(
            nameof(Yms.Core.Enums.UserRole.Admin),
            nameof(Yms.Core.Enums.UserRole.YardManager)));

    options.AddPolicy("vehicles.view", policy =>
        policy.RequireRole(
            nameof(Yms.Core.Enums.UserRole.Admin),
            nameof(Yms.Core.Enums.UserRole.YardManager),
            nameof(Yms.Core.Enums.UserRole.YardJockey),
            nameof(Yms.Core.Enums.UserRole.Operator),
            nameof(Yms.Core.Enums.UserRole.GateSecurity),
            nameof(Yms.Core.Enums.UserRole.ViewOnly),
            nameof(Yms.Core.Enums.UserRole.Driver)));
});

var app = builder.Build();

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
    var db = scope.ServiceProvider.GetRequiredService<YmsDbContext>();
    if (app.Environment.IsDevelopment())
    {
        await db.Database.MigrateAsync(CancellationToken.None);
    }

    async Task Exec(string sql)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync(sql, CancellationToken.None);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
        }
    }

    await Exec("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"UpdatedAt\" timestamp with time zone;");
    await Exec("ALTER TABLE \"Drivers\" ADD COLUMN IF NOT EXISTS \"UserId\" uuid;");
    await Exec("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Drivers_UserId\" ON \"Drivers\" (\"UserId\");");

    await Exec(@"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Yards') THEN
        IF NOT EXISTS (SELECT 1 FROM ""Yards"" WHERE lower(""Name"") = 'north yard') THEN
            INSERT INTO ""Yards"" (""Id"", ""Name"", ""CreatedAtUtc"") VALUES (gen_random_uuid(), 'North Yard', now());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM ""Yards"" WHERE lower(""Name"") = 'east yard') THEN
            INSERT INTO ""Yards"" (""Id"", ""Name"", ""CreatedAtUtc"") VALUES (gen_random_uuid(), 'East Yard', now());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM ""Yards"" WHERE lower(""Name"") = 'west yard') THEN
            INSERT INTO ""Yards"" (""Id"", ""Name"", ""CreatedAtUtc"") VALUES (gen_random_uuid(), 'West Yard', now());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM ""Yards"" WHERE lower(""Name"") = 'south yard') THEN
            INSERT INTO ""Yards"" (""Id"", ""Name"", ""CreatedAtUtc"") VALUES (gen_random_uuid(), 'South Yard', now());
        END IF;
    END IF;
END $$;
");

    await Exec("ALTER TABLE \"Docks\" ADD COLUMN IF NOT EXISTS \"UpdatedAt\" timestamp with time zone;");

    await Exec(@"
DO $$
DECLARE
    y RECORD;
    i INTEGER;
    dock_name TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Yards')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Docks') THEN

        FOR y IN
            SELECT ""Id"" AS yard_id
            FROM ""Yards""
            WHERE lower(""Name"") IN ('north yard','east yard','west yard','south yard')
        LOOP
            FOR i IN 1..10 LOOP
                dock_name := 'Dock ' || i;
                IF NOT EXISTS (
                    SELECT 1
                    FROM ""Docks""
                    WHERE ""YardId"" = y.yard_id AND lower(""Name"") = lower(dock_name)
                ) THEN
                    INSERT INTO ""Docks"" (""Id"", ""YardId"", ""Name"", ""Status"", ""CreatedAtUtc"")
                    VALUES (gen_random_uuid(), y.yard_id, dock_name, 1, now());
                END IF;
            END LOOP;
        END LOOP;
    END IF;
END $$;
");

    await Exec(
        "CREATE TABLE IF NOT EXISTS \"VehicleAuditLogs\" (" +
        "\"Id\" uuid NOT NULL," +
        "\"VehicleId\" uuid NOT NULL," +
        "\"ActorUserId\" uuid NOT NULL," +
        "\"ActorRole\" varchar(50) NOT NULL," +
        "\"EventType\" varchar(80) NOT NULL," +
        "\"FromStatus\" int," +
        "\"ToStatus\" int," +
        "\"FromIsOnHold\" boolean," +
        "\"ToIsOnHold\" boolean," +
        "\"FromDockId\" uuid," +
        "\"ToDockId\" uuid," +
        "\"FromYardSectionId\" uuid," +
        "\"ToYardSectionId\" uuid," +
        "\"DetailsJson\" text," +
        "\"OccurredAtUtc\" timestamp with time zone NOT NULL," +
        "\"CreatedAtUtc\" timestamp with time zone NOT NULL," +
        "\"UpdatedAt\" timestamp with time zone," +
        "CONSTRAINT \"PK_VehicleAuditLogs\" PRIMARY KEY (\"Id\")," +
        "CONSTRAINT \"FK_VehicleAuditLogs_Vehicles_VehicleId\" FOREIGN KEY (\"VehicleId\") REFERENCES \"Vehicles\"(\"Id\") ON DELETE CASCADE" +
        ");");
    await Exec("CREATE INDEX IF NOT EXISTS \"IX_VehicleAuditLogs_VehicleId\" ON \"VehicleAuditLogs\" (\"VehicleId\");");
    await Exec("CREATE INDEX IF NOT EXISTS \"IX_VehicleAuditLogs_OccurredAtUtc\" ON \"VehicleAuditLogs\" (\"OccurredAtUtc\");");
    await Exec("CREATE INDEX IF NOT EXISTS \"IX_VehicleAuditLogs_EventType\" ON \"VehicleAuditLogs\" (\"EventType\");");

    await Exec("ALTER TABLE \"Appointments\" ADD COLUMN IF NOT EXISTS \"UpdatedAt\" timestamp with time zone;");

    // Keep schema aligned with EF model (Yms.Core.Entities.Yard): Name, Address, CreatedAtUtc, UpdatedAt.
    // Do not create an incompatible Yards table definition.
    await Exec(@"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Yards') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Yards' AND column_name = 'Address'
        ) THEN
            ALTER TABLE ""Yards"" ADD COLUMN ""Address"" varchar(500);
        END IF;

        -- If an older schema used Location, migrate it into Address when Address is empty.
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Yards' AND column_name = 'Location'
        ) THEN
            UPDATE ""Yards""
            SET ""Address"" = COALESCE(""Address"", ""Location"")
            WHERE (""Address"" IS NULL OR ""Address"" = '') AND ""Location"" IS NOT NULL;
        END IF;
    END IF;
END $$;
");

    var seeder = scope.ServiceProvider.GetRequiredService<AdminSeeder>();
    await seeder.EnsureSeededAsync(CancellationToken.None);
}

app.Run();
