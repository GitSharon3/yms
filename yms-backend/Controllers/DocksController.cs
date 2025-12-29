using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

using Yms.Core.Dtos.Docks;
using Yms.Core.Enums;
using Yms.Infrastructure.Data;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/docks")]
[Authorize]
public sealed class DocksController : ControllerBase
{
    private readonly YmsDbContext _db;

    public DocksController(YmsDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.YardManager)},{nameof(UserRole.GateSecurity)},{nameof(UserRole.ViewOnly)}")]
    public async Task<ActionResult<List<DockDto>>> GetAll(
        [FromQuery] Guid? yardId = null,
        [FromQuery] int take = 250,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);

        try
        {
            var q = _db.Docks
                .AsNoTracking()
                .AsQueryable();

            if (yardId.HasValue) q = q.Where(d => d.YardId == yardId.Value);

            var items = await q
                .OrderBy(d => d.Name)
                .Take(take)
                .Select(d => new DockDto(d.Id, d.YardId, d.Name, d.Status, d.CreatedAtUtc))
                .ToListAsync(cancellationToken);

            return Ok(items);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return Ok(new List<DockDto>());
        }
    }
}
