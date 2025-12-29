using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

using Yms.Core.Dtos.Appointments;
using Yms.Core.Entities;
using Yms.Core.Enums;
using Yms.Infrastructure.Data;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/appointments")]
[Authorize]
public sealed class AppointmentsController : ControllerBase
{
    private readonly YmsDbContext _db;

    public AppointmentsController(YmsDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.ViewOnly)},{nameof(UserRole.Driver)}")]
    public async Task<ActionResult<List<AppointmentDto>>> GetAll(
        [FromQuery] Guid? yardId = null,
        [FromQuery] Guid? dockId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        [FromQuery] int take = 250,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = GetActorUserId();

        try
        {
            var q = _db.Appointments
                .AsNoTracking()
                .Include(a => a.Dock)
                .Include(a => a.Yard)
                .Include(a => a.History)
                .Include(a => a.Vehicle)
                .ThenInclude(v => v!.Driver)
                .AsQueryable();

            if (role == nameof(UserRole.Driver))
            {
                q = q.Where(a => a.Vehicle != null && a.Vehicle.Driver != null && a.Vehicle.Driver.UserId == userId);
            }

            if (yardId.HasValue) q = q.Where(a => a.YardId == yardId.Value);
            if (dockId.HasValue) q = q.Where(a => a.DockId == dockId.Value);

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AppointmentStatus>(status.Trim(), true, out var parsedStatus))
            {
                q = q.Where(a => a.Status == parsedStatus);
            }

            if (!string.IsNullOrWhiteSpace(priority) && Enum.TryParse<AppointmentPriority>(priority.Trim(), true, out var parsedPriority))
            {
                q = q.Where(a => a.Priority == parsedPriority);
            }

            if (fromUtc.HasValue) q = q.Where(a => a.ScheduledEndUtc >= fromUtc.Value);
            if (toUtc.HasValue) q = q.Where(a => a.ScheduledStartUtc <= toUtc.Value);

            var items = await q
                .OrderByDescending(a => a.ScheduledStartUtc)
                .Take(take)
                .Select(a => new AppointmentDto(
                    a.Id.ToString(),
                    a.Code,
                    a.YardId.ToString(),
                    a.DockId.HasValue ? a.DockId.Value.ToString() : null,
                    a.VehicleId.HasValue ? a.VehicleId.Value.ToString() : null,
                    a.Status,
                    a.ScheduledStartUtc,
                    a.ScheduledEndUtc,
                    a.Vehicle != null ? a.Vehicle.VehicleNumber : (a.VehicleId.HasValue ? a.VehicleId.Value.ToString() : "Unassigned"),
                    a.Vehicle != null && a.Vehicle.Driver != null ? a.Vehicle.Driver.FullName : "Unassigned",
                    a.Dock != null ? a.Dock.Name : (a.DockId.HasValue ? a.DockId.Value.ToString() : "No dock"),
                    a.Yard != null ? a.Yard.Name : a.YardId.ToString(),
                    a.CargoType,
                    a.Notes,
                    a.History
                        .OrderByDescending(h => h.AtUtc)
                        .Select(h => new AppointmentHistoryItemDto(h.Status, h.AtUtc, h.Note))
                        .ToList()
                ))
                .ToListAsync(cancellationToken);

            return Ok(items);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            // relation does not exist (e.g. missing table). Keep API stable; frontend will fallback to demo data.
            return Ok(new List<AppointmentDto>());
        }
        catch (Exception ex) when (
            ex is PostgresException { SqlState: "42P01" } ||
            ex.InnerException is PostgresException { SqlState: "42P01" })
        {
            // Some EF execution paths wrap the underlying PostgresException.
            return Ok(new List<AppointmentDto>());
        }
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<AppointmentDto>> Create([FromBody] CreateAppointmentRequestDto request, CancellationToken cancellationToken)
    {
        if (request.YardId == Guid.Empty) return BadRequest(new { message = "YardId is required" });
        if (request.ScheduledEndUtc <= request.ScheduledStartUtc) return BadRequest(new { message = "ScheduledTimeWindow is invalid" });
        if (string.IsNullOrWhiteSpace(request.CargoType)) return BadRequest(new { message = "CargoType is required" });

        var nowUtc = DateTime.UtcNow;

        var yardExists = await _db.Yards.AsNoTracking().AnyAsync(y => y.Id == request.YardId, cancellationToken);
        if (!yardExists) return BadRequest(new { message = "Yard not found" });

        if (request.DockId.HasValue)
        {
            var dockExists = await _db.Docks.AsNoTracking().AnyAsync(d => d.Id == request.DockId.Value, cancellationToken);
            if (!dockExists) return BadRequest(new { message = "Dock not found" });
        }

        if (request.VehicleId.HasValue)
        {
            var vehicleExists = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == request.VehicleId.Value, cancellationToken);
            if (!vehicleExists) return BadRequest(new { message = "Vehicle not found" });
        }

        var conflict = await HasSchedulingConflictAsync(
            request.YardId,
            request.DockId,
            request.ScheduledStartUtc,
            request.ScheduledEndUtc,
            excludeAppointmentId: null,
            cancellationToken);

        if (conflict)
        {
            return BadRequest(new { message = "Scheduling conflict: another appointment already exists for this time window." });
        }

        var code = await GenerateNextAppointmentCodeAsync(cancellationToken);

        var created = new Appointment
        {
            Id = Guid.NewGuid(),
            Code = code,
            YardId = request.YardId,
            DockId = request.DockId,
            VehicleId = request.VehicleId,
            ScheduledStartUtc = request.ScheduledStartUtc,
            ScheduledEndUtc = request.ScheduledEndUtc,
            CargoType = request.CargoType.Trim(),
            Priority = request.Priority,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            Status = AppointmentStatus.Scheduled,
            CreatedAtUtc = nowUtc
        };

        created.History.Add(new AppointmentHistoryItem
        {
            Id = Guid.NewGuid(),
            AppointmentId = created.Id,
            Status = AppointmentStatus.Scheduled,
            AtUtc = nowUtc,
            Note = string.IsNullOrWhiteSpace(request.Notes) ? "Created" : $"Created: {request.Notes.Trim()}",
            CreatedAtUtc = nowUtc
        });

        _db.Appointments.Add(created);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new AppointmentDto(
            created.Id.ToString(),
            created.Code,
            created.YardId.ToString(),
            created.DockId.HasValue ? created.DockId.Value.ToString() : null,
            created.VehicleId.HasValue ? created.VehicleId.Value.ToString() : null,
            created.Status,
            created.ScheduledStartUtc,
            created.ScheduledEndUtc,
            created.VehicleId.HasValue ? created.VehicleId.Value.ToString() : "Unassigned",
            "Unassigned",
            created.DockId.HasValue ? created.DockId.Value.ToString() : "No dock",
            created.YardId.ToString(),
            created.CargoType,
            created.Notes,
            created.History
                .OrderByDescending(h => h.AtUtc)
                .Select(h => new AppointmentHistoryItemDto(h.Status, h.AtUtc, h.Note))
                .ToList()));
    }

    [HttpPatch("{id:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<ActionResult<AppointmentDto>> Update(Guid id, [FromBody] UpdateAppointmentRequestDto request, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;

        var appt = await _db.Appointments
            .Include(a => a.Dock)
            .Include(a => a.Yard)
            .Include(a => a.History)
            .Include(a => a.Vehicle)
            .ThenInclude(v => v!.Driver)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appt is null) return NotFound();

        if (appt.Status is AppointmentStatus.Completed or AppointmentStatus.Cancelled)
        {
            return BadRequest(new { message = "Completed or cancelled appointments cannot be modified." });
        }

        var prevStart = appt.ScheduledStartUtc;
        var prevEnd = appt.ScheduledEndUtc;
        var prevStatus = appt.Status;

        if (request.ScheduledStartUtc.HasValue) appt.ScheduledStartUtc = request.ScheduledStartUtc.Value;
        if (request.ScheduledEndUtc.HasValue) appt.ScheduledEndUtc = request.ScheduledEndUtc.Value;
        if (appt.ScheduledEndUtc <= appt.ScheduledStartUtc) return BadRequest(new { message = "ScheduledTimeWindow is invalid" });

        if (request.DockId.HasValue)
        {
            var dockExists = await _db.Docks.AsNoTracking().AnyAsync(d => d.Id == request.DockId.Value, cancellationToken);
            if (!dockExists) return BadRequest(new { message = "Dock not found" });
            appt.DockId = request.DockId.Value;
        }

        if (request.VehicleId.HasValue)
        {
            var vehicleExists = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == request.VehicleId.Value, cancellationToken);
            if (!vehicleExists) return BadRequest(new { message = "Vehicle not found" });
            appt.VehicleId = request.VehicleId.Value;
        }

        if (request.CargoType != null)
        {
            if (string.IsNullOrWhiteSpace(request.CargoType)) return BadRequest(new { message = "CargoType is required" });
            appt.CargoType = request.CargoType.Trim();
        }

        if (request.Priority.HasValue) appt.Priority = request.Priority.Value;

        var requestedStatus = request.Status;
        var requestedNote = request.ActionNote;
        var noteTrimmed = requestedNote is null ? null : (string.IsNullOrWhiteSpace(requestedNote) ? null : requestedNote.Trim());

        if (requestedStatus.HasValue && requestedStatus.Value == AppointmentStatus.Cancelled && string.IsNullOrWhiteSpace(noteTrimmed))
        {
            return BadRequest(new { message = "Cancellation requires a note/reason." });
        }

        var scheduleChanged = prevStart != appt.ScheduledStartUtc || prevEnd != appt.ScheduledEndUtc;
        if (scheduleChanged)
        {
            var conflict = await HasSchedulingConflictAsync(
                appt.YardId,
                appt.DockId,
                appt.ScheduledStartUtc,
                appt.ScheduledEndUtc,
                excludeAppointmentId: appt.Id,
                cancellationToken);

            if (conflict)
            {
                return BadRequest(new { message = "Scheduling conflict: another appointment already exists for this time window." });
            }
        }

        if (request.Notes != null) appt.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        if (requestedStatus.HasValue)
        {
            appt.Status = requestedStatus.Value;
        }
        else if (scheduleChanged)
        {
            appt.Status = AppointmentStatus.Rescheduled;
        }

        var historyNote = string.Empty;
        if (appt.Status == AppointmentStatus.Cancelled)
        {
            historyNote = noteTrimmed is null ? "Cancelled" : $"Cancelled: {noteTrimmed}";
        }
        else if (appt.Status == AppointmentStatus.Rescheduled)
        {
            historyNote = noteTrimmed is null ? "Rescheduled" : $"Rescheduled: {noteTrimmed}";
        }
        else if (appt.Status != prevStatus)
        {
            historyNote = noteTrimmed is null ? $"Status changed: {prevStatus} → {appt.Status}" : $"Status changed: {prevStatus} → {appt.Status}. {noteTrimmed}";
        }
        else if (scheduleChanged)
        {
            historyNote = noteTrimmed is null
                ? $"Rescheduled: {prevStart:o}-{prevEnd:o} → {appt.ScheduledStartUtc:o}-{appt.ScheduledEndUtc:o}"
                : $"Rescheduled: {prevStart:o}-{prevEnd:o} → {appt.ScheduledStartUtc:o}-{appt.ScheduledEndUtc:o}. {noteTrimmed}";
        }
        else if (noteTrimmed is not null)
        {
            historyNote = $"Updated: {noteTrimmed}";
        }

        if (!string.IsNullOrWhiteSpace(historyNote))
        {
            appt.History.Add(new AppointmentHistoryItem
            {
                Id = Guid.NewGuid(),
                AppointmentId = appt.Id,
                Status = appt.Status,
                AtUtc = nowUtc,
                Note = historyNote,
                CreatedAtUtc = nowUtc
            });
        }

        appt.UpdatedAt = nowUtc;
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Retry once by reloading the latest state and re-applying the same request.
            _db.ChangeTracker.Clear();

            var retry = await _db.Appointments
                .Include(a => a.Dock)
                .Include(a => a.Yard)
                .Include(a => a.History)
                .Include(a => a.Vehicle)
                .ThenInclude(v => v!.Driver)
                .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

            if (retry is null) return NotFound();

            if (retry.Status is AppointmentStatus.Completed or AppointmentStatus.Cancelled)
            {
                return BadRequest(new { message = "Completed or cancelled appointments cannot be modified." });
            }

            var retryPrevStart = retry.ScheduledStartUtc;
            var retryPrevEnd = retry.ScheduledEndUtc;
            var retryPrevStatus = retry.Status;

            if (request.ScheduledStartUtc.HasValue) retry.ScheduledStartUtc = request.ScheduledStartUtc.Value;
            if (request.ScheduledEndUtc.HasValue) retry.ScheduledEndUtc = request.ScheduledEndUtc.Value;
            if (retry.ScheduledEndUtc <= retry.ScheduledStartUtc) return BadRequest(new { message = "ScheduledTimeWindow is invalid" });

            if (request.DockId.HasValue)
            {
                var dockExists = await _db.Docks.AsNoTracking().AnyAsync(d => d.Id == request.DockId.Value, cancellationToken);
                if (!dockExists) return BadRequest(new { message = "Dock not found" });
                retry.DockId = request.DockId.Value;
            }

            if (request.VehicleId.HasValue)
            {
                var vehicleExists = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == request.VehicleId.Value, cancellationToken);
                if (!vehicleExists) return BadRequest(new { message = "Vehicle not found" });
                retry.VehicleId = request.VehicleId.Value;
            }

            if (request.CargoType != null)
            {
                if (string.IsNullOrWhiteSpace(request.CargoType)) return BadRequest(new { message = "CargoType is required" });
                retry.CargoType = request.CargoType.Trim();
            }

            if (request.Priority.HasValue) retry.Priority = request.Priority.Value;

            var retryRequestedStatus = request.Status;
            var retryRequestedNote = request.ActionNote;
            var retryNoteTrimmed = retryRequestedNote is null ? null : (string.IsNullOrWhiteSpace(retryRequestedNote) ? null : retryRequestedNote.Trim());

            if (retryRequestedStatus.HasValue && retryRequestedStatus.Value == AppointmentStatus.Cancelled && string.IsNullOrWhiteSpace(retryNoteTrimmed))
            {
                return BadRequest(new { message = "Cancellation requires a note/reason." });
            }

            var retryScheduleChanged = retryPrevStart != retry.ScheduledStartUtc || retryPrevEnd != retry.ScheduledEndUtc;
            if (retryScheduleChanged)
            {
                var conflict = await HasSchedulingConflictAsync(
                    retry.YardId,
                    retry.DockId,
                    retry.ScheduledStartUtc,
                    retry.ScheduledEndUtc,
                    excludeAppointmentId: retry.Id,
                    cancellationToken);

                if (conflict)
                {
                    return BadRequest(new { message = "Scheduling conflict: another appointment already exists for this time window." });
                }
            }

            if (request.Notes != null) retry.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

            if (retryRequestedStatus.HasValue)
            {
                retry.Status = retryRequestedStatus.Value;
            }
            else if (retryScheduleChanged)
            {
                retry.Status = AppointmentStatus.Rescheduled;
            }

            var retryHistoryNote = string.Empty;
            if (retry.Status == AppointmentStatus.Cancelled)
            {
                retryHistoryNote = retryNoteTrimmed is null ? "Cancelled" : $"Cancelled: {retryNoteTrimmed}";
            }
            else if (retry.Status == AppointmentStatus.Rescheduled)
            {
                retryHistoryNote = retryNoteTrimmed is null ? "Rescheduled" : $"Rescheduled: {retryNoteTrimmed}";
            }
            else if (retry.Status != retryPrevStatus)
            {
                retryHistoryNote = retryNoteTrimmed is null
                    ? $"Status changed: {retryPrevStatus} → {retry.Status}"
                    : $"Status changed: {retryPrevStatus} → {retry.Status}. {retryNoteTrimmed}";
            }
            else if (retryScheduleChanged)
            {
                retryHistoryNote = retryNoteTrimmed is null
                    ? $"Rescheduled: {retryPrevStart:o}-{retryPrevEnd:o} → {retry.ScheduledStartUtc:o}-{retry.ScheduledEndUtc:o}"
                    : $"Rescheduled: {retryPrevStart:o}-{retryPrevEnd:o} → {retry.ScheduledStartUtc:o}-{retry.ScheduledEndUtc:o}. {retryNoteTrimmed}";
            }
            else if (retryNoteTrimmed is not null)
            {
                retryHistoryNote = $"Updated: {retryNoteTrimmed}";
            }

            if (!string.IsNullOrWhiteSpace(retryHistoryNote))
            {
                retry.History.Add(new AppointmentHistoryItem
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = retry.Id,
                    Status = retry.Status,
                    AtUtc = nowUtc,
                    Note = retryHistoryNote,
                    CreatedAtUtc = nowUtc
                });
            }

            retry.UpdatedAt = nowUtc;

            try
            {
                await _db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Fallback: apply the update via SQL (no optimistic concurrency check), then persist history.
                var rows = await _db.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE ""Appointments""
SET
    ""DockId"" = {retry.DockId},
    ""VehicleId"" = {retry.VehicleId},
    ""ScheduledStartUtc"" = {retry.ScheduledStartUtc},
    ""ScheduledEndUtc"" = {retry.ScheduledEndUtc},
    ""Status"" = {(int)retry.Status},
    ""CargoType"" = {retry.CargoType},
    ""Priority"" = {(int)retry.Priority},
    ""Notes"" = {retry.Notes},
    ""UpdatedAt"" = {retry.UpdatedAt}
WHERE ""Id"" = {retry.Id};
", cancellationToken);

                if (rows != 1) return NotFound();

                // Important: clear tracking so we don't try to update the Appointment entity again.
                _db.ChangeTracker.Clear();

                // Persist history entry (best-effort, but should succeed if schema is aligned).
                if (!string.IsNullOrWhiteSpace(retryHistoryNote))
                {
                    _db.AppointmentHistoryItems.Add(new AppointmentHistoryItem
                    {
                        Id = Guid.NewGuid(),
                        AppointmentId = retry.Id,
                        Status = retry.Status,
                        AtUtc = nowUtc,
                        Note = retryHistoryNote,
                        CreatedAtUtc = nowUtc
                    });
                    await _db.SaveChangesAsync(cancellationToken);
                }

                appt = await _db.Appointments
                    .AsNoTracking()
                    .Include(a => a.Dock)
                    .Include(a => a.Yard)
                    .Include(a => a.History)
                    .Include(a => a.Vehicle)
                    .ThenInclude(v => v!.Driver)
                    .FirstOrDefaultAsync(a => a.Id == retry.Id, cancellationToken) ?? retry;

                return Ok(new AppointmentDto(
                    appt.Id.ToString(),
                    appt.Code,
                    appt.YardId.ToString(),
                    appt.DockId.HasValue ? appt.DockId.Value.ToString() : null,
                    appt.VehicleId.HasValue ? appt.VehicleId.Value.ToString() : null,
                    appt.Status,
                    appt.ScheduledStartUtc,
                    appt.ScheduledEndUtc,
                    appt.Vehicle != null ? appt.Vehicle.VehicleNumber : (appt.VehicleId.HasValue ? appt.VehicleId.Value.ToString() : "Unassigned"),
                    appt.Vehicle != null && appt.Vehicle.Driver != null ? appt.Vehicle.Driver.FullName : "Unassigned",
                    appt.Dock != null ? appt.Dock.Name : (appt.DockId.HasValue ? appt.DockId.Value.ToString() : "No dock"),
                    appt.Yard != null ? appt.Yard.Name : appt.YardId.ToString(),
                    appt.CargoType,
                    appt.Notes,
                    appt.History
                        .OrderByDescending(h => h.AtUtc)
                        .Select(h => new AppointmentHistoryItemDto(h.Status, h.AtUtc, h.Note))
                        .ToList()));
            }

            appt = retry;
        }

        return Ok(new AppointmentDto(
            appt.Id.ToString(),
            appt.Code,
            appt.YardId.ToString(),
            appt.DockId.HasValue ? appt.DockId.Value.ToString() : null,
            appt.VehicleId.HasValue ? appt.VehicleId.Value.ToString() : null,
            appt.Status,
            appt.ScheduledStartUtc,
            appt.ScheduledEndUtc,
            appt.Vehicle != null ? appt.Vehicle.VehicleNumber : (appt.VehicleId.HasValue ? appt.VehicleId.Value.ToString() : "Unassigned"),
            appt.Vehicle != null && appt.Vehicle.Driver != null ? appt.Vehicle.Driver.FullName : "Unassigned",
            appt.Dock != null ? appt.Dock.Name : (appt.DockId.HasValue ? appt.DockId.Value.ToString() : "No dock"),
            appt.Yard != null ? appt.Yard.Name : appt.YardId.ToString(),
            appt.CargoType,
            appt.Notes,
            appt.History
                .OrderByDescending(h => h.AtUtc)
                .Select(h => new AppointmentHistoryItemDto(h.Status, h.AtUtc, h.Note))
                .ToList()));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var appt = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (appt is null) return NotFound();

        _db.Appointments.Remove(appt);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<bool> HasSchedulingConflictAsync(
        Guid yardId,
        Guid? dockId,
        DateTime startUtc,
        DateTime endUtc,
        Guid? excludeAppointmentId,
        CancellationToken cancellationToken)
    {
        var q = _db.Appointments.AsNoTracking().Where(a => a.Status != AppointmentStatus.Cancelled);
        if (excludeAppointmentId.HasValue) q = q.Where(a => a.Id != excludeAppointmentId.Value);

        // Prefer dock-level conflict prevention when a dock is assigned, otherwise yard-level.
        if (dockId.HasValue)
        {
            q = q.Where(a => a.DockId.HasValue && a.DockId.Value == dockId.Value);
        }
        else
        {
            q = q.Where(a => a.YardId == yardId);
        }

        // Overlap check: existing.Start < newEnd && existing.End > newStart
        q = q.Where(a => a.ScheduledStartUtc < endUtc && a.ScheduledEndUtc > startUtc);
        return await q.AnyAsync(cancellationToken);
    }

    private async Task<string> GenerateNextAppointmentCodeAsync(CancellationToken cancellationToken)
    {
        // Generates short readable codes like APT-1032.
        // Note: relies on DB unique constraint for safety; this is best-effort.
        var prefix = "APT-";

        var last = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.Code.StartsWith(prefix))
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => a.Code)
            .FirstOrDefaultAsync(cancellationToken);

        var nextNumber = 1000;
        if (!string.IsNullOrWhiteSpace(last))
        {
            var suffix = last.Substring(prefix.Length);
            if (int.TryParse(suffix, out var parsed)) nextNumber = Math.Max(1000, parsed + 1);
        }

        // Try a few times in case of concurrent creation.
        for (var i = 0; i < 10; i++)
        {
            var candidate = $"{prefix}{nextNumber + i}";
            var exists = await _db.Appointments.AsNoTracking().AnyAsync(a => a.Code == candidate, cancellationToken);
            if (!exists) return candidate;
        }

        return $"{prefix}{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
    }

    private Guid GetActorUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        _ = Guid.TryParse(sub, out var id);
        return id;
    }
}
