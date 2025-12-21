namespace Yms.Core.Dtos.Dashboard;

public sealed record DashboardOverviewDto(
    DashboardKpisDto Kpis,
    YardCapacityDto YardCapacity,
    IReadOnlyList<VehicleStatusRowDto> Vehicles,
    AppointmentStatusDistributionDto AppointmentsDistribution,
    IReadOnlyList<UpcomingAppointmentDto> UpcomingAppointments,
    IReadOnlyList<ActivityFeedItemDto> RecentActivity);

public sealed record DashboardKpisDto(
    int TrucksInYard,
    int GateQueue,
    int RecentGateActivities,
    int AvailableDocks,
    int UpcomingAppointments);

public sealed record YardCapacityDto(int Allocated, int Available, int Maintenance);

public sealed record VehicleStatusRowDto(
    string VehicleNumber,
    string Type,
    string Status,
    string Location,
    string Driver);

public sealed record AppointmentStatusDistributionDto(
    int Scheduled,
    int CheckedIn,
    int Completed,
    int Missed,
    int Cancelled);

public sealed record UpcomingAppointmentDto(
    Guid Id,
    DateTime ScheduledStartUtc,
    DateTime ScheduledEndUtc,
    string Status,
    string? VehicleNumber,
    string? DockName);

public sealed record ActivityFeedItemDto(
    Guid Id,
    DateTime OccurredAtUtc,
    string Title,
    string Description,
    string Type);
