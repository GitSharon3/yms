using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Yms.Core.Dtos.Appointments;
using Yms.Core.Enums;
using Yms.Infrastructure.Data;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/appointments")]
[Authorize(Roles = nameof(UserRole.Admin))]
public sealed class AppointmentsController : ControllerBase
{
    private readonly YmsDbContext _db;

    public AppointmentsController(YmsDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    [HttpGet]
    public async Task<ActionResult<List<AppointmentDto>>> GetAll(CancellationToken cancellationToken)
    {
        try
        {
            // Intentionally avoid joining Yard/Dock/Vehicle tables so this endpoint stays safe
            // even if some tables are missing or the schema is partially initialized.
            var items = await _db.Appointments
                .AsNoTracking()
                .OrderByDescending(a => a.ScheduledStartUtc)
                .Take(250)
                .Select(a => new AppointmentDto(
                    a.Id.ToString(),
                    a.Status,
                    a.ScheduledStartUtc,
                    a.ScheduledEndUtc,
                    a.VehicleId.HasValue ? a.VehicleId.Value.ToString() : "Unassigned",
                    "Unassigned",
                    a.DockId.HasValue ? a.DockId.Value.ToString() : "No dock",
                    a.YardId.ToString(),
                    "Unloading",
                    null,
                    new List<AppointmentHistoryItemDto>
                    {
                        new AppointmentHistoryItemDto(a.Status, a.ScheduledStartUtc, a.Status == Yms.Core.Enums.AppointmentStatus.Scheduled ? "Scheduled" : null)
                    }
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
}
