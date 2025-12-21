using Yms.Core.Dtos.Dashboard;

namespace Yms.Core.Interfaces;

public interface IDashboardReadRepository
{
    Task<DashboardOverviewDto> GetOverviewAsync(DateTime nowUtc, TimeSpan upcomingWindow, CancellationToken cancellationToken);
}
