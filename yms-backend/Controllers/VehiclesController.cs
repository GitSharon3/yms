using System.Security.Claims;
using System.Text.Json;
using System.Linq;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

using Yms.Core.Dtos.Vehicles;
using Yms.Core.Entities;
using Yms.Core.Enums;
using Yms.Infrastructure.Data;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/vehicles")]
[Authorize]
public sealed class VehiclesController : ControllerBase
{
    private readonly YmsDbContext _db;

    public VehiclesController(YmsDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    public sealed record UpdateVehicleDriverUserRequestDto(Guid? UserId);

    public sealed record CreateVehicleRequestDto(
        string VehicleNumber,
        string? TrailerNumber,
        string Type,
        string? CarrierName,
        string? LicensePlate,
        string? Notes);

    [HttpPost]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<VehicleDto>> Create([FromBody] CreateVehicleRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.VehicleNumber)) return BadRequest(new { message = "VehicleNumber is required" });
        if (string.IsNullOrWhiteSpace(request.Type)) return BadRequest(new { message = "Type is required" });

        if (!Enum.TryParse<VehicleType>(request.Type.Trim(), true, out var parsedType))
        {
            return BadRequest(new { message = "Invalid vehicle type" });
        }

        var vn = request.VehicleNumber.Trim();
        var exists = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.VehicleNumber == vn, cancellationToken);
        if (exists) return BadRequest(new { message = "VehicleNumber already exists" });

        var nowUtc = DateTime.UtcNow;
        var actorUserId = GetActorUserId();
        var actorRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        var vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            VehicleNumber = vn,
            TrailerNumber = string.IsNullOrWhiteSpace(request.TrailerNumber) ? null : request.TrailerNumber.Trim(),
            Type = parsedType,
            Status = VehicleStatus.PreArrival,
            IsOnHold = false,
            HoldReason = null,
            CreatedAtUtc = nowUtc,
            UpdatedAt = nowUtc
        };

        _db.Vehicles.Add(vehicle);

        _db.VehicleAuditLogs.Add(new VehicleAuditLog
        {
            Id = Guid.NewGuid(),
            VehicleId = vehicle.Id,
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            EventType = "VehicleCreated",
            DetailsJson = JsonSerializer.Serialize(new
            {
                request.VehicleNumber,
                request.TrailerNumber,
                request.Type,
                request.CarrierName,
                request.LicensePlate,
                request.Notes
            }),
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        });

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(await ToDtoAsync(vehicle, cancellationToken));
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.YardJockey)},{nameof(UserRole.Operator)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.ViewOnly)},{nameof(UserRole.Driver)}")]
    public async Task<ActionResult<List<VehicleDto>>> GetAll(
        [FromQuery] string? status = null,
        [FromQuery] Guid? yardSectionId = null,
        [FromQuery] Guid? dockId = null,
        [FromQuery] bool? onHold = null,
        [FromQuery] string? appointmentPriority = null,
        [FromQuery] DateTime? appointmentFromUtc = null,
        [FromQuery] DateTime? appointmentToUtc = null,
        [FromQuery] int take = 250,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = GetActorUserId();
        var nowUtc = DateTime.UtcNow;

        try
        {
            var q = _db.Vehicles
                .AsNoTracking()
                .Include(v => v.Driver)
                .Include(v => v.Dock)
                .Include(v => v.YardSection)
                .AsQueryable();

            if (role == nameof(UserRole.GateSecurity))
            {
                q = q.Where(v => v.Status == VehicleStatus.InQueue || v.Status == VehicleStatus.Departed);
            }

            if (role == nameof(UserRole.Operator) || role == nameof(UserRole.YardJockey))
            {
                q = q.Where(v => _db.VehicleAssignments.Any(a => a.VehicleId == v.Id && a.UserId == userId && a.IsActive));
            }

            if (role == nameof(UserRole.Driver))
            {
                q = q.Where(v => v.Driver != null && v.Driver.UserId == userId);
            }

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<VehicleStatus>(status.Trim(), true, out var parsedStatus))
            {
                q = q.Where(v => v.Status == parsedStatus);
            }

            if (yardSectionId.HasValue)
            {
                q = q.Where(v => v.YardSectionId == yardSectionId.Value);
            }

            if (dockId.HasValue)
            {
                q = q.Where(v => v.DockId == dockId.Value);
            }

            if (onHold.HasValue)
            {
                q = q.Where(v => v.IsOnHold == onHold.Value);
            }

            if (!string.IsNullOrWhiteSpace(appointmentPriority) && Enum.TryParse<AppointmentPriority>(appointmentPriority.Trim(), true, out var parsedPriority))
            {
                q = q.Where(v => _db.Appointments.Any(a => a.VehicleId == v.Id && a.Priority == parsedPriority));
            }

            if (appointmentFromUtc.HasValue)
            {
                q = q.Where(v => _db.Appointments.Any(a => a.VehicleId == v.Id && a.ScheduledEndUtc >= appointmentFromUtc.Value));
            }

            if (appointmentToUtc.HasValue)
            {
                q = q.Where(v => _db.Appointments.Any(a => a.VehicleId == v.Id && a.ScheduledStartUtc <= appointmentToUtc.Value));
            }

            var items = await q
                .OrderByDescending(v => v.CreatedAtUtc)
                .Take(take)
                .Select(v => new VehicleDto(
                    v.Id,
                    v.VehicleNumber,
                    v.TrailerNumber,
                    v.Type.ToString(),
                    v.Status.ToString(),
                    v.IsOnHold,
                    v.HoldReason,
                    _db.Appointments
                        .Where(a => a.VehicleId == v.Id && a.ScheduledStartUtc >= nowUtc)
                        .OrderBy(a => a.ScheduledStartUtc)
                        .Select(a => (Guid?)a.Id)
                        .FirstOrDefault(),
                    _db.Appointments
                        .Where(a => a.VehicleId == v.Id && a.ScheduledStartUtc >= nowUtc)
                        .OrderBy(a => a.ScheduledStartUtc)
                        .Select(a => (DateTime?)a.ScheduledStartUtc)
                        .FirstOrDefault(),
                    _db.Appointments
                        .Where(a => a.VehicleId == v.Id && a.ScheduledStartUtc >= nowUtc)
                        .OrderBy(a => a.ScheduledStartUtc)
                        .Select(a => (DateTime?)a.ScheduledEndUtc)
                        .FirstOrDefault(),
                    _db.Appointments
                        .Where(a => a.VehicleId == v.Id && a.ScheduledStartUtc >= nowUtc)
                        .OrderBy(a => a.ScheduledStartUtc)
                        .Select(a => a.Priority.ToString())
                        .FirstOrDefault(),
                    _db.Appointments
                        .Where(a => a.VehicleId == v.Id && a.ScheduledStartUtc >= nowUtc)
                        .OrderBy(a => a.ScheduledStartUtc)
                        .Select(a => a.Status.ToString())
                        .FirstOrDefault(),
                    v.YardSectionId,
                    v.YardSection != null ? v.YardSection.Name : null,
                    v.DockId,
                    v.Dock != null ? v.Dock.Name : null,
                    v.DriverId,
                    v.Driver != null ? v.Driver.FullName : null,
                    v.CreatedAtUtc,
                    v.UpdatedAt))
                .ToListAsync(cancellationToken);

            return Ok(items);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return Ok(new List<VehicleDto>());
        }
    }

    [HttpGet("{id:guid}/timeline")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.YardJockey)},{nameof(UserRole.Operator)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.ViewOnly)},{nameof(UserRole.Driver)}")]
    public async Task<ActionResult<List<Yms.Core.Dtos.Vehicles.VehicleAuditLogDto>>> GetTimeline(
        Guid id,
        [FromQuery] int take = 250,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = GetActorUserId();

        try
        {
            var vehicle = await _db.Vehicles
                .AsNoTracking()
                .Include(v => v.Driver)
                .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

            if (vehicle is null) return NotFound();

            if (role == nameof(UserRole.Driver))
            {
                if (vehicle.Driver == null || vehicle.Driver.UserId != userId) return Forbid();
            }

            if (role == nameof(UserRole.GateSecurity) && vehicle.Status != VehicleStatus.InQueue && vehicle.Status != VehicleStatus.Departed)
            {
                return Forbid();
            }

            if ((role == nameof(UserRole.Operator) || role == nameof(UserRole.YardJockey)) && !await HasActiveAssignmentAsync(id, userId, cancellationToken))
            {
                return Forbid();
            }

            var items = await _db.VehicleAuditLogs
                .AsNoTracking()
                .Where(x => x.VehicleId == id)
                .OrderByDescending(x => x.OccurredAtUtc)
                .Take(take)
                .Select(x => new Yms.Core.Dtos.Vehicles.VehicleAuditLogDto(
                    x.Id,
                    x.VehicleId,
                    x.ActorUserId,
                    x.ActorRole,
                    x.EventType,
                    x.FromStatus.HasValue ? x.FromStatus.Value.ToString() : null,
                    x.ToStatus.HasValue ? x.ToStatus.Value.ToString() : null,
                    x.FromIsOnHold,
                    x.ToIsOnHold,
                    x.FromDockId,
                    x.ToDockId,
                    x.FromYardSectionId,
                    x.ToYardSectionId,
                    x.DetailsJson,
                    x.OccurredAtUtc))
                .ToListAsync(cancellationToken);

            return Ok(items);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return Ok(new List<Yms.Core.Dtos.Vehicles.VehicleAuditLogDto>());
        }
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.YardJockey)},{nameof(UserRole.Operator)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.ViewOnly)},{nameof(UserRole.Driver)}")]
    public async Task<ActionResult<VehicleDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = GetActorUserId();

        try
        {
            var v = await _db.Vehicles
                .AsNoTracking()
                .Include(x => x.Driver)
                .Include(x => x.Dock)
                .Include(x => x.YardSection)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (v is null) return NotFound();

            if (role == nameof(UserRole.Driver))
            {
                if (v.Driver == null || v.Driver.UserId != userId) return Forbid();
            }

            if (role == nameof(UserRole.GateSecurity) && v.Status != VehicleStatus.InQueue && v.Status != VehicleStatus.Departed)
            {
                return Forbid();
            }

            if ((role == nameof(UserRole.Operator) || role == nameof(UserRole.YardJockey)) && !await HasActiveAssignmentAsync(id, userId, cancellationToken))
            {
                return Forbid();
            }

            return Ok(await ToDtoAsync(v, cancellationToken));
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/assignments")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<List<VehicleAssignmentDto>>> GetAssignments(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var exists = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == id, cancellationToken);
            if (!exists) return NotFound();

            var items = await _db.VehicleAssignments
                .AsNoTracking()
                .Where(a => a.VehicleId == id)
                .Include(a => a.User)
                .OrderByDescending(a => a.AssignedAtUtc)
                .Take(100)
                .Select(a => new VehicleAssignmentDto(
                    a.Id,
                    a.VehicleId,
                    a.UserId,
                    a.User != null ? a.User.Username : string.Empty,
                    a.AssignmentRole,
                    a.IsActive,
                    a.AssignedAtUtc,
                    a.UnassignedAtUtc))
                .ToListAsync(cancellationToken);

            return Ok(items);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return Ok(new List<VehicleAssignmentDto>());
        }
    }

    [HttpPost("{id:guid}/assign")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<IActionResult> Assign(Guid id, [FromBody] AssignVehicleRequestDto request, CancellationToken cancellationToken)
    {
        if (request.UserId == Guid.Empty) return BadRequest(new { message = "UserId is required" });
        if (string.IsNullOrWhiteSpace(request.AssignmentRole)) return BadRequest(new { message = "AssignmentRole is required" });

        var role = request.AssignmentRole.Trim();
        if (!string.Equals(role, "Operator", StringComparison.OrdinalIgnoreCase) && !string.Equals(role, "Jockey", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "AssignmentRole must be Operator or Jockey" });
        }

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (vehicle is null) return NotFound();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null) return BadRequest(new { message = "User not found" });

        var nowUtc = DateTime.UtcNow;

        var existing = await _db.VehicleAssignments
            .Where(a => a.VehicleId == id && a.UserId == request.UserId && a.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var e in existing)
        {
            e.IsActive = false;
            e.UnassignedAtUtc = nowUtc;
            e.UpdatedAt = nowUtc;
        }

        var created = new VehicleAssignment
        {
            Id = Guid.NewGuid(),
            VehicleId = id,
            UserId = request.UserId,
            AssignmentRole = string.Equals(role, "Jockey", StringComparison.OrdinalIgnoreCase) ? "Jockey" : "Operator",
            IsActive = true,
            AssignedAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        };

        _db.VehicleAssignments.Add(created);

        _db.VehicleAuditLogs.Add(new VehicleAuditLog
        {
            Id = Guid.NewGuid(),
            VehicleId = id,
            ActorUserId = GetActorUserId(),
            ActorRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
            EventType = "AssignmentCreated",
            DetailsJson = JsonSerializer.Serialize(new { request.UserId, created.AssignmentRole }),
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        });

        await _db.SaveChangesAsync(cancellationToken);

        return Ok();
    }

    [HttpPost("{id:guid}/unassign")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<IActionResult> Unassign(Guid id, [FromQuery] Guid userId, CancellationToken cancellationToken)
    {
        if (userId == Guid.Empty) return BadRequest(new { message = "userId is required" });

        var nowUtc = DateTime.UtcNow;

        var items = await _db.VehicleAssignments
            .Where(a => a.VehicleId == id && a.UserId == userId && a.IsActive)
            .ToListAsync(cancellationToken);

        if (items.Count == 0) return NotFound();

        foreach (var a in items)
        {
            a.IsActive = false;
            a.UnassignedAtUtc = nowUtc;
            a.UpdatedAt = nowUtc;
        }

        _db.VehicleAuditLogs.Add(new VehicleAuditLog
        {
            Id = Guid.NewGuid(),
            VehicleId = id,
            ActorUserId = GetActorUserId(),
            ActorRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
            EventType = "AssignmentEnded",
            DetailsJson = JsonSerializer.Serialize(new { userId }),
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        });

        await _db.SaveChangesAsync(cancellationToken);
        return Ok();
    }

    [HttpPut("{id:guid}/driver-user")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<VehicleDto>> UpdateDriverUser(Guid id, [FromBody] UpdateVehicleDriverUserRequestDto request, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var actorUserId = GetActorUserId();
        var actorRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        var vehicle = await _db.Vehicles
            .Include(v => v.Driver)
            .Include(v => v.Dock)
            .Include(v => v.YardSection)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null) return NotFound();

        var fromDriverId = vehicle.DriverId;

        if (request.UserId is null)
        {
            vehicle.DriverId = null;
            vehicle.UpdatedAt = nowUtc;

            _db.VehicleAuditLogs.Add(new VehicleAuditLog
            {
                Id = Guid.NewGuid(),
                VehicleId = id,
                ActorUserId = actorUserId,
                ActorRole = actorRole,
                EventType = "DriverUnlinked",
                DetailsJson = JsonSerializer.Serialize(new { fromDriverId }),
                OccurredAtUtc = nowUtc,
                CreatedAtUtc = nowUtc
            });

            await _db.SaveChangesAsync(cancellationToken);
            return Ok(await ToDtoAsync(vehicle, cancellationToken));
        }

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.UserId.Value, cancellationToken);
        if (user is null) return BadRequest(new { message = "User not found" });
        if (!string.Equals(user.Role, nameof(UserRole.Driver), StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Selected user is not a Driver" });
        }

        var existingDriver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == user.Id, cancellationToken);
        if (existingDriver is null)
        {
            var parts = (user.FullName ?? user.Username ?? "Driver")
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var first = parts.Length > 0 ? parts[0] : "Driver";
            var last = parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : string.Empty;

            existingDriver = new Driver
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                FirstName = first,
                LastName = last,
                Phone = user.Phone,
                CreatedAtUtc = nowUtc
            };

            _db.Drivers.Add(existingDriver);
        }

        vehicle.DriverId = existingDriver.Id;
        vehicle.UpdatedAt = nowUtc;

        _db.VehicleAuditLogs.Add(new VehicleAuditLog
        {
            Id = Guid.NewGuid(),
            VehicleId = id,
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            EventType = "DriverLinked",
            DetailsJson = JsonSerializer.Serialize(new { fromDriverId, toDriverId = existingDriver.Id, driverUserId = user.Id }),
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        });

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(await ToDtoAsync(vehicle, cancellationToken));
    }

    [HttpPatch("{id:guid}/hold")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<VehicleDto>> SetHold(Guid id, [FromBody] SetVehicleHoldRequestDto request, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = (GetActorUserId(), User.FindFirstValue(ClaimTypes.Role) ?? string.Empty);
        var nowUtc = DateTime.UtcNow;

        var vehicle = await _db.Vehicles
            .Include(v => v.Driver)
            .Include(v => v.Dock)
            .Include(v => v.YardSection)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null) return NotFound();

        var fromHold = vehicle.IsOnHold;
        var fromReason = vehicle.HoldReason;

        if (request.IsOnHold)
        {
            if (string.IsNullOrWhiteSpace(request.HoldReason))
            {
                return BadRequest(new { message = "HoldReason is required when placing a vehicle on hold" });
            }

            vehicle.IsOnHold = true;
            vehicle.HoldReason = request.HoldReason!.Trim();
        }
        else
        {
            vehicle.IsOnHold = false;
            vehicle.HoldReason = null;
        }

        vehicle.UpdatedAt = nowUtc;

        _db.VehicleAuditLogs.Add(new VehicleAuditLog
        {
            Id = Guid.NewGuid(),
            VehicleId = id,
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            EventType = request.IsOnHold ? "HoldPlaced" : "HoldReleased",
            FromIsOnHold = fromHold,
            ToIsOnHold = vehicle.IsOnHold,
            DetailsJson = JsonSerializer.Serialize(new { fromReason, toReason = vehicle.HoldReason }),
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        });

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(await ToDtoAsync(vehicle, cancellationToken));
    }

    [HttpPatch("{id:guid}/location")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<VehicleDto>> UpdateLocation(Guid id, [FromBody] UpdateVehicleLocationRequestDto request, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = (GetActorUserId(), User.FindFirstValue(ClaimTypes.Role) ?? string.Empty);
        var nowUtc = DateTime.UtcNow;

        var vehicle = await _db.Vehicles
            .Include(v => v.Driver)
            .Include(v => v.Dock)
            .Include(v => v.YardSection)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null) return NotFound();

        if (vehicle.IsOnHold)
        {
            return BadRequest(new { message = "Vehicle is on hold. Release hold before changing location." });
        }

        var fromDockId = vehicle.DockId;
        var fromYardSectionId = vehicle.YardSectionId;

        vehicle.YardSectionId = request.YardSectionId;
        vehicle.DockId = request.DockId;
        vehicle.UpdatedAt = nowUtc;

        _db.VehicleAuditLogs.Add(new VehicleAuditLog
        {
            Id = Guid.NewGuid(),
            VehicleId = id,
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            EventType = "LocationUpdated",
            FromDockId = fromDockId,
            ToDockId = vehicle.DockId,
            FromYardSectionId = fromYardSectionId,
            ToYardSectionId = vehicle.YardSectionId,
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        });

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(await ToDtoAsync(vehicle, cancellationToken));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.YardJockey)},{nameof(UserRole.Operator)}")]
    public async Task<ActionResult<VehicleDto>> UpdateStatus(Guid id, [FromBody] UpdateVehicleStatusRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Status)) return BadRequest(new { message = "Status is required" });
        if (!Enum.TryParse<VehicleStatus>(request.Status.Trim(), true, out var desired))
        {
            return BadRequest(new { message = "Invalid status" });
        }

        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = GetActorUserId();
        var nowUtc = DateTime.UtcNow;

        var vehicle = await _db.Vehicles
            .Include(v => v.Driver)
            .Include(v => v.Dock)
            .Include(v => v.YardSection)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null) return NotFound();

        if (vehicle.IsOnHold)
        {
            return BadRequest(new { message = "Vehicle is on hold. Release hold before changing status." });
        }

        if (role == nameof(UserRole.Operator) || role == nameof(UserRole.YardJockey))
        {
            if (!await HasActiveAssignmentAsync(id, userId, cancellationToken)) return Forbid();

            if (!IsOperatorAllowedTransition(vehicle.Status, desired))
            {
                return BadRequest(new { message = "Invalid status transition for assigned operator" });
            }
        }

        if (role == nameof(UserRole.YardManager))
        {
            if (!IsManagerAllowedTransition(vehicle.Status, desired))
            {
                return BadRequest(new { message = "Invalid status transition for yard manager" });
            }
        }

        var fromStatus = vehicle.Status;
        vehicle.Status = desired;
        vehicle.UpdatedAt = nowUtc;

        _db.VehicleAuditLogs.Add(new VehicleAuditLog
        {
            Id = Guid.NewGuid(),
            VehicleId = id,
            ActorUserId = userId,
            ActorRole = role,
            EventType = "StatusUpdated",
            FromStatus = fromStatus,
            ToStatus = desired,
            OccurredAtUtc = nowUtc,
            CreatedAtUtc = nowUtc
        });

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(await ToDtoAsync(vehicle, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var actorUserId = GetActorUserId();
        var actorRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        try
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
            if (vehicle is null) return NotFound();

            var vehicleNumber = vehicle.VehicleNumber;

            _db.Vehicles.Remove(vehicle);

            _db.VehicleAuditLogs.Add(new VehicleAuditLog
            {
                Id = Guid.NewGuid(),
                VehicleId = id,
                ActorUserId = actorUserId,
                ActorRole = actorRole,
                EventType = "VehicleDeleted",
                DetailsJson = JsonSerializer.Serialize(new { vehicleNumber }),
                OccurredAtUtc = nowUtc,
                CreatedAtUtc = nowUtc
            });

            await _db.SaveChangesAsync(cancellationToken);
            return NoContent();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23503")
        {
            return Conflict(new { message = "Vehicle cannot be deleted because it is referenced by other records." });
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/audit")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<List<Yms.Core.Dtos.Gate.GateAuditEventDto>>> GetAudit(Guid id, [FromQuery] int take = 200, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);

        try
        {
            var exists = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == id, cancellationToken);
            if (!exists) return NotFound();

            var items = await _db.GateAuditEvents
                .AsNoTracking()
                .Where(x => x.VehicleId == id)
                .OrderByDescending(x => x.OccurredAtUtc)
                .Take(take)
                .Select(x => new Yms.Core.Dtos.Gate.GateAuditEventDto(
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
            return Ok(new List<Yms.Core.Dtos.Gate.GateAuditEventDto>());
        }
    }

    private Guid GetActorUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        _ = Guid.TryParse(sub, out var id);
        return id;
    }

    private Task<bool> HasActiveAssignmentAsync(Guid vehicleId, Guid userId, CancellationToken cancellationToken)
    {
        if (userId == Guid.Empty) return Task.FromResult(false);

        return _db.VehicleAssignments.AsNoTracking().AnyAsync(
            a => a.VehicleId == vehicleId && a.UserId == userId && a.IsActive,
            cancellationToken);
    }

    private static bool IsOperatorAllowedTransition(VehicleStatus from, VehicleStatus to)
    {
        if (from == VehicleStatus.InYard && to == VehicleStatus.AtDock) return true;
        if (from == VehicleStatus.AtDock && to == VehicleStatus.InYard) return true;
        return false;
    }

    private static bool IsManagerAllowedTransition(VehicleStatus from, VehicleStatus to)
    {
        if (from == to) return true;
        if (from == VehicleStatus.InQueue && to == VehicleStatus.InYard) return true;
        if (from == VehicleStatus.InYard && to == VehicleStatus.AtDock) return true;
        if (from == VehicleStatus.AtDock && to == VehicleStatus.InYard) return true;
        if (from == VehicleStatus.InYard && to == VehicleStatus.Departed) return true;
        if (from == VehicleStatus.AtDock && to == VehicleStatus.Departed) return true;
        return false;
    }

    private async Task<VehicleDto> ToDtoAsync(Vehicle v, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var next = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.VehicleId == v.Id && a.ScheduledStartUtc >= nowUtc)
            .OrderBy(a => a.ScheduledStartUtc)
            .Select(a => new
            {
                a.Id,
                a.ScheduledStartUtc,
                a.ScheduledEndUtc,
                Priority = a.Priority.ToString(),
                Status = a.Status.ToString()
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new VehicleDto(
            v.Id,
            v.VehicleNumber,
            v.TrailerNumber,
            v.Type.ToString(),
            v.Status.ToString(),
            v.IsOnHold,
            v.HoldReason,
            next?.Id,
            next?.ScheduledStartUtc,
            next?.ScheduledEndUtc,
            next?.Priority,
            next?.Status,
            v.YardSectionId,
            v.YardSection != null ? v.YardSection.Name : null,
            v.DockId,
            v.Dock != null ? v.Dock.Name : null,
            v.DriverId,
            v.Driver != null ? v.Driver.FullName : null,
            v.CreatedAtUtc,
            v.UpdatedAt);
    }
}
