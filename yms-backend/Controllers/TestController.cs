using Microsoft.AspNetCore.Mvc;

namespace Yms.Backend.Controllers;

/// <summary>
/// Test controller for health checks and basic connectivity tests
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class TestController : ControllerBase
{
    /// <summary>
    /// Simple health check endpoint
    /// </summary>
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { message = "YMS Backend is running!", timestamp = DateTime.UtcNow });
    }
}
