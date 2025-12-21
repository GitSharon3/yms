using Microsoft.EntityFrameworkCore;

using Yms.Core.Dtos.Dashboard;
using Yms.Core.Enums;
using Yms.Core.Interfaces;
using Yms.Infrastructure.Data;

namespace Yms.Infrastructure.Repositories;

public sealed class DashboardReadRepository : IDashboardReadRepository
{
    private readonly YmsDbContext _db;

    public DashboardReadRepository(YmsDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardOverviewDto> GetOverviewAsync(DateTime nowUtc, TimeSpan upcomingWindow, CancellationToken cancellationToken)
    {
        var upcomingUntilUtc = nowUtc.Add(upcomingWindow);
        var recentFromUtc = nowUtc.AddHours(-24);

        var trucksInYard = await _db.Vehicles
            .CountAsync(x => x.Status == VehicleStatus.InYard || x.Status == VehicleStatus.AtDock, cancellationToken);

        var gateQueue = await _db.Vehicles
            .CountAsync(x => x.Status == VehicleStatus.InQueue, cancellationToken);

        var recentGateActivities = await _db.GateActivities
            .CountAsync(x => x.OccurredAtUtc >= recentFromUtc, cancellationToken);

        var availableDocks = await _db.Docks
            .CountAsync(x => x.Status == DockStatus.Available, cancellationToken);

        var upcomingAppointmentsCount = await _db.Appointments
            .CountAsync(x => x.ScheduledStartUtc >= nowUtc && x.ScheduledStartUtc <= upcomingUntilUtc && x.Status == AppointmentStatus.Scheduled, cancellationToken);

        var totalCapacity = await _db.YardSections.SumAsync(x => (int?)x.Capacity, cancellationToken) ?? 0;
        var allocated = await _db.Vehicles
            .CountAsync(x => x.Status == VehicleStatus.InYard || x.Status == VehicleStatus.AtDock, cancellationToken);

        var maintenance = await _db.Docks.CountAsync(x => x.Status == DockStatus.Maintenance, cancellationToken);
        var available = Math.Max(0, totalCapacity - allocated);

        var vehicles = await _db.Vehicles
            .AsNoTracking()
            .Include(x => x.Driver)
            .Include(x => x.Dock)
            .Include(x => x.YardSection)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(7)
            .Select(x => new VehicleStatusRowDto(
                x.VehicleNumber,
                x.Type.ToString(),
                x.Status.ToString(),
                x.Dock != null ? x.Dock.Name : (x.YardSection != null ? x.YardSection.Name : "-"),
                x.Driver != null ? (x.Driver.FirstName + " " + x.Driver.LastName).Trim() : "-"))
            .ToListAsync(cancellationToken);

        var dist = await _db.Appointments
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        int Get(AppointmentStatus s) => dist.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

        var distribution = new AppointmentStatusDistributionDto(
            Scheduled: Get(AppointmentStatus.Scheduled),
            CheckedIn: Get(AppointmentStatus.CheckedIn),
            Completed: Get(AppointmentStatus.Completed),
            Missed: Get(AppointmentStatus.Missed),
            Cancelled: Get(AppointmentStatus.Cancelled));

        var upcomingAppointments = await _db.Appointments
            .AsNoTracking()
            .Include(x => x.Dock)
            .Include(x => x.Vehicle)
            .Where(x => x.ScheduledStartUtc >= nowUtc && x.ScheduledStartUtc <= upcomingUntilUtc)
            .OrderBy(x => x.ScheduledStartUtc)
            .Take(6)
            .Select(x => new UpcomingAppointmentDto(
                x.Id,
                x.ScheduledStartUtc,
                x.ScheduledEndUtc,
                x.Status.ToString(),
                x.Vehicle != null ? x.Vehicle.VehicleNumber : null,
                x.Dock != null ? x.Dock.Name : null))
            .ToListAsync(cancellationToken);

        var recentActivity = await _db.GateActivities
            .AsNoTracking()
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(10)
            .Select(x => new ActivityFeedItemDto(
                x.Id,
                x.OccurredAtUtc,
                x.Type.ToString(),
                (x.Vehicle != null ? x.Vehicle.VehicleNumber : "Vehicle") + " at " + x.GateName,
                x.Type.ToString()))
            .ToListAsync(cancellationToken);

        var kpis = new DashboardKpisDto(
            TrucksInYard: trucksInYard,
            GateQueue: gateQueue,
            RecentGateActivities: recentGateActivities,
            AvailableDocks: availableDocks,
            UpcomingAppointments: upcomingAppointmentsCount);

        return new DashboardOverviewDto(
            Kpis: kpis,
            YardCapacity: new YardCapacityDto(Allocated: allocated, Available: available, Maintenance: maintenance),
            Vehicles: vehicles,
            AppointmentsDistribution: distribution,
            UpcomingAppointments: upcomingAppointments,
            RecentActivity: recentActivity);
    }
}
