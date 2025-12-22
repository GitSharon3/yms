using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Yms.Core.Dtos.Yards;
using Yms.Core.Enums;
using Yms.Core.Interfaces;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = nameof(UserRole.Admin))]
public sealed class YardsController : ControllerBase
{
    private readonly IYardService _yards;

    public YardsController(IYardService yards)
    {
        _yards = yards ?? throw new ArgumentNullException(nameof(yards));
    }

    [HttpGet]
    public async Task<ActionResult<List<YardDto>>> GetAll(CancellationToken cancellationToken)
    {
        var yards = await _yards.GetAllAsync(cancellationToken);
        return Ok(yards);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<YardDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var yard = await _yards.GetByIdAsync(id, cancellationToken);
        if (yard is null)
        {
            return NotFound();
        }

        return Ok(yard);
    }

    [HttpPost]
    public async Task<ActionResult<YardDto>> Create([FromBody] CreateYardRequestDto request, CancellationToken cancellationToken)
    {
        var yard = await _yards.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = yard.Id }, yard);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<YardDto>> Update(Guid id, [FromBody] UpdateYardRequestDto request, CancellationToken cancellationToken)
    {
        var yard = await _yards.UpdateAsync(id, request, cancellationToken);
        if (yard is null)
        {
            return NotFound();
        }

        return Ok(yard);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _yards.DeleteAsync(id, cancellationToken);
        if (!ok)
        {
            return NotFound();
        }
        return NoContent();
    }
}
