using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Yms.Core.Dtos.Dashboard;
using Yms.Core.Interfaces;

namespace Yms.Backend.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin")]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboard;

    public DashboardController(IDashboardService dashboard)
    {
        _dashboard = dashboard ?? throw new ArgumentNullException(nameof(dashboard));
    }

    [HttpGet("overview")]
    public async Task<ActionResult<DashboardOverviewDto>> GetOverview(CancellationToken cancellationToken)
    {
        var dto = await _dashboard.GetOverviewAsync(cancellationToken);
        return Ok(dto);
    }
}
