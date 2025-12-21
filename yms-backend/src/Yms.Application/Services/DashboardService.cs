using Microsoft.Extensions.Configuration;

using Yms.Core.Dtos.Dashboard;
using Yms.Core.Interfaces;

namespace Yms.Application.Services;

public sealed class DashboardService : IDashboardService
{
    private readonly IDashboardReadRepository _dashboard;
    private readonly IConfiguration _configuration;

    public DashboardService(IDashboardReadRepository dashboard, IConfiguration configuration)
    {
        _dashboard = dashboard;
        _configuration = configuration;
    }

    public async Task<DashboardOverviewDto> GetOverviewAsync(CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;

        var minutes = _configuration.GetValue<int?>("Dashboard:UpcomingWindowMinutes") ?? 240;
        var window = TimeSpan.FromMinutes(minutes);

        return await _dashboard.GetOverviewAsync(nowUtc, window, cancellationToken);
    }
}
