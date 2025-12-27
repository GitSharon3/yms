using System.Security.Claims;
using System.Text.Json;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

using Yms.Core.Dtos.Gate;
using Yms.Core.Entities;
using Yms.Core.Enums;
using Yms.Infrastructure.Data;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/gate")]
[Authorize]
public sealed class GateOperationsController : ControllerBase
{
    private readonly YmsDbContext _db;

    public GateOperationsController(YmsDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    [HttpGet("activities")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.YardJockey)},{nameof(UserRole.Operator)},{nameof(UserRole.ViewOnly)},{nameof(UserRole.Driver)}")]
    public async Task<ActionResult<List<GateActivityDto>>> GetRecentActivities([FromQuery] int take = 150, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);

        try
        {
            var items = await _db.GateActivities
                .AsNoTracking()
                .OrderByDescending(x => x.OccurredAtUtc)
                .Take(take)
                .Select(x => new GateActivityDto(
                    x.Id,
                    x.Type,
                    x.GateName,
                    x.VehicleId,
                    x.Vehicle != null ? x.Vehicle.VehicleNumber : null,
                    x.DriverId,
                    x.Driver != null ? x.Driver.FullName : null,
                    x.OccurredAtUtc))
                .ToListAsync(cancellationToken);

            return Ok(items);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return Ok(new List<GateActivityDto>());
        }
    }

    [HttpGet("audit")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<List<GateAuditEventDto>>> GetRecentAudit([FromQuery] int take = 250, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);

        try
        {
            var items = await _db.GateAuditEvents
                .AsNoTracking()
                .OrderByDescending(x => x.OccurredAtUtc)
                .Take(take)
                .Select(x => new GateAuditEventDto(
                    x.Id,
                    x.Action,
                    x.Outcome,
                    x.ActorUserId,
                    x.ActorRole,
                    x.GateName,
                    x.VehicleId,
                    x.DriverId,
                    x.TrailerNumber,
                    x.SealNumber,
                    x.DockOrParking,
                    x.OccurredAtUtc))
                .ToListAsync(cancellationToken);

            return Ok(items);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return Ok(new List<GateAuditEventDto>());
        }
    }

    [HttpPost("check-in")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.Driver)}")]
    public async Task<ActionResult<GateActionResultDto>> CheckIn([FromBody] GateCheckInRequestDto request, CancellationToken cancellationToken)
    {
        return await ExecuteGateAction(
            action: "CheckIn",
            activityType: GateActivityType.CheckIn,
            gateName: request.GateName,
            vehicleNumber: request.VehicleNumber,
            driverName: request.DriverName,
            trailerNumber: request.TrailerNumber,
            sealNumber: request.SealNumber,
            dockOrParking: request.DockOrParking,
            outcome: "Allowed",
            setVehicleStatus: VehicleStatus.InQueue,
            details: request,
            cancellationToken: cancellationToken);
    }

    [HttpPost("check-out")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.Driver)}")]
    public async Task<ActionResult<GateActionResultDto>> CheckOut([FromBody] GateCheckOutRequestDto request, CancellationToken cancellationToken)
    {
        return await ExecuteGateAction(
            action: "CheckOut",
            activityType: GateActivityType.CheckOut,
            gateName: request.GateName,
            vehicleNumber: request.VehicleNumber,
            driverName: request.DriverName,
            trailerNumber: request.TrailerNumber,
            sealNumber: request.SealNumber,
            dockOrParking: request.DockOrParking,
            outcome: "Allowed",
            setVehicleStatus: VehicleStatus.Departed,
            details: request,
            cancellationToken: cancellationToken);
    }

    [HttpPost("move-to-dock")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.YardJockey)},{nameof(UserRole.Operator)}")]
    public async Task<ActionResult<GateActionResultDto>> MoveToDock([FromBody] GateMoveToDockRequestDto request, CancellationToken cancellationToken)
    {
        return await ExecuteGateAction(
            action: "MovedToDock",
            activityType: GateActivityType.MovedToDock,
            gateName: request.GateName,
            vehicleNumber: request.VehicleNumber,
            driverName: null,
            trailerNumber: null,
            sealNumber: null,
            dockOrParking: request.DockOrParking,
            outcome: "Confirmed",
            setVehicleStatus: VehicleStatus.AtDock,
            details: request,
            cancellationToken: cancellationToken);
    }

    [HttpPost("security-event")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.GateSecurity)}")]
    public async Task<ActionResult<GateActionResultDto>> SecurityEvent([FromBody] GateSecurityEventRequestDto request, CancellationToken cancellationToken)
    {
        var detailsJson = JsonSerializer.Serialize(request);
        var (actorUserId, actorRole) = GetActor();
        var nowUtc = DateTime.UtcNow;

        var vehicle = await UpsertVehicleAsync(request.VehicleNumber, cancellationToken);
        Driver? driver = null;
        if (!string.IsNullOrWhiteSpace(request.DriverName))
        {
            driver = await UpsertDriverAsync(request.DriverName!, cancellationToken);
        }

        var audit = new GateAuditEvent
        {
            Id = Guid.NewGuid(),
            Action = $"Security:{request.EventType}",
            Outcome = request.Severity,
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            GateName = request.GateName?.Trim() ?? "Gate",
            VehicleId = vehicle.Id,
            DriverId = driver?.Id,
            TrailerNumber = request.TrailerNumber,
            SealNumber = request.SealNumber,
            DockOrParking = null,
            DetailsJson = detailsJson,
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        };

        _db.GateAuditEvents.Add(audit);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new GateActionResultDto("Security event logged", vehicle.Id, driver?.Id, nowUtc));
    }

    private (Guid userId, string role) GetActor()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        _ = Guid.TryParse(sub, out var id);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        return (id, role);
    }

    private async Task<ActionResult<GateActionResultDto>> ExecuteGateAction(
        string action,
        GateActivityType activityType,
        string gateName,
        string vehicleNumber,
        string? driverName,
        string? trailerNumber,
        string? sealNumber,
        string? dockOrParking,
        string outcome,
        VehicleStatus setVehicleStatus,
        object details,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(gateName)) return BadRequest(new { message = "GateName is required" });
        if (string.IsNullOrWhiteSpace(vehicleNumber)) return BadRequest(new { message = "VehicleNumber is required" });

        var nowUtc = DateTime.UtcNow;
        var (actorUserId, actorRole) = GetActor();

        var vehicle = await UpsertVehicleAsync(vehicleNumber, cancellationToken);
        vehicle.Status = setVehicleStatus;

        Driver? driver = null;
        if (!string.IsNullOrWhiteSpace(driverName))
        {
            driver = await UpsertDriverAsync(driverName!, cancellationToken);
            vehicle.DriverId = driver.Id;
        }

        var activity = new GateActivity
        {
            Id = Guid.NewGuid(),
            Type = activityType,
            GateName = gateName.Trim(),
            VehicleId = vehicle.Id,
            DriverId = driver?.Id,
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        };

        var audit = new GateAuditEvent
        {
            Id = Guid.NewGuid(),
            Action = action,
            Outcome = outcome,
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            GateName = gateName.Trim(),
            VehicleId = vehicle.Id,
            DriverId = driver?.Id,
            TrailerNumber = trailerNumber,
            SealNumber = sealNumber,
            DockOrParking = dockOrParking,
            DetailsJson = JsonSerializer.Serialize(details),
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        };

        _db.GateActivities.Add(activity);
        _db.GateAuditEvents.Add(audit);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new GateActionResultDto($"{action} recorded", vehicle.Id, driver?.Id, nowUtc));
    }

    private async Task<Vehicle> UpsertVehicleAsync(string vehicleNumber, CancellationToken cancellationToken)
    {
        var vn = vehicleNumber.Trim();
        var existing = await _db.Vehicles.FirstOrDefaultAsync(x => x.VehicleNumber == vn, cancellationToken);
        if (existing != null) return existing;

        var nowUtc = DateTime.UtcNow;
        var created = new Vehicle
        {
            Id = Guid.NewGuid(),
            VehicleNumber = vn,
            Type = VehicleType.ContainerTruck,
            Status = VehicleStatus.InQueue,
            CreatedAtUtc = nowUtc
        };

        _db.Vehicles.Add(created);
        await _db.SaveChangesAsync(cancellationToken);
        return created;
    }

    private async Task<Driver> UpsertDriverAsync(string driverName, CancellationToken cancellationToken)
    {
        var name = driverName.Trim();
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var first = parts.Length > 0 ? parts[0] : name;
        var last = parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : "";

        var existing = await _db.Drivers.FirstOrDefaultAsync(x => x.FirstName == first && x.LastName == last, cancellationToken);
        if (existing != null) return existing;

        var nowUtc = DateTime.UtcNow;
        var created = new Driver
        {
            Id = Guid.NewGuid(),
            FirstName = first,
            LastName = last,
            CreatedAtUtc = nowUtc
        };

        _db.Drivers.Add(created);
        await _db.SaveChangesAsync(cancellationToken);
        return created;
    }
}
