using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using yms_backend.Data;
using yms_backend.Models;

namespace yms_backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public sealed class YardsController : ControllerBase
{
    private readonly YmsDbContext _db;

    public YardsController(YmsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<Yard>>> GetAll(CancellationToken cancellationToken)
    {
        var yards = await _db.Yards
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(yards);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Yard>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var yard = await _db.Yards.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (yard is null)
        {
            return NotFound();
        }

        return Ok(yard);
    }

    public sealed record CreateYardRequest(string Name, string? Address);

    [HttpPost]
    public async Task<ActionResult<Yard>> Create([FromBody] CreateYardRequest request, CancellationToken cancellationToken)
    {
        var yard = new Yard
        {
            Name = request.Name,
            Address = request.Address
        };

        _db.Yards.Add(yard);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = yard.Id }, yard);
    }

    public sealed record UpdateYardRequest(string Name, string? Address);

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Yard>> Update(Guid id, [FromBody] UpdateYardRequest request, CancellationToken cancellationToken)
    {
        var yard = await _db.Yards.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (yard is null)
        {
            return NotFound();
        }

        yard.Name = request.Name;
        yard.Address = request.Address;

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(yard);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var yard = await _db.Yards.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (yard is null)
        {
            return NotFound();
        }

        _db.Yards.Remove(yard);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
