using Yms.Core.Dtos.Dashboard;

namespace Yms.Core.Interfaces;

public interface IDashboardService
{
    Task<DashboardOverviewDto> GetOverviewAsync(CancellationToken cancellationToken);
}
