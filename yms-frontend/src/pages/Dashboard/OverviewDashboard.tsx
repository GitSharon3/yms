import { useEffect, useMemo, useState } from 'react';

import { getDashboardOverview, type DashboardOverviewDto } from '../../api/dashboard';
import { DashboardCard } from './components/DashboardCard';
import { StatCard } from './components/StatCard';
import { DonutChart } from './components/DonutChart';
import { BarChart } from './components/BarChart';
import { Badge } from './components/Badge';
import { YardMapPlaceholder } from './components/YardMapPlaceholder';

function formatTimeAgo(occurredAtUtc: string) {
  const d = new Date(occurredAtUtc);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatUtcRange(startUtc: string, endUtc: string) {
  const start = new Date(startUtc);
  const end = new Date(endUtc);
  const time = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = start.toLocaleDateString([], { month: 'short', day: '2-digit' });
  return `${date} • ${time(start)} - ${time(end)}`;
}

export function OverviewDashboard() {
  const [data, setData] = useState<DashboardOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void getDashboardOverview()
      .then((res) => {
        if (!mounted) return;
        setData(res);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const yardSegments = useMemo(
    () =>
      data
        ? [
            { label: 'Allocated', value: data.yardCapacity.allocated, color: '#2563eb' },
            { label: 'Available', value: data.yardCapacity.available, color: '#22c55e' },
            { label: 'Maintenance', value: data.yardCapacity.maintenance, color: '#94a3b8' },
          ]
        : [],
    [data],
  );

  const appointmentBars = useMemo(
    () =>
      data
        ? [
            { label: 'Scheduled', value: data.appointmentsDistribution.scheduled, color: '#2563eb' },
            { label: 'Checked In', value: data.appointmentsDistribution.checkedIn, color: '#f59e0b' },
            { label: 'Completed', value: data.appointmentsDistribution.completed, color: '#22c55e' },
            { label: 'Missed', value: data.appointmentsDistribution.missed, color: '#ef4444' },
            { label: 'Cancelled', value: data.appointmentsDistribution.cancelled, color: '#94a3b8' },
          ]
        : [],
    [data],
  );

  if (loading) {
    return (
      <div className="ymsPage">
        <div className="ymsLoading">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ymsPage">
        <div className="ymsError">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ymsPage">
        <div className="ymsError">No data.</div>
      </div>
    );
  }

  return (
    <div className="ymsPage">
      <div className="ymsPageHeader">
        <div>
          <div className="ymsPageTitle">Overview Dashboard</div>
          <div className="ymsPageSub">Operational visibility across yard, gates, docks, and appointments.</div>
        </div>
      </div>

      <div className="kpiGrid">
        <StatCard label="Trucks in Yard" value={data.kpis.trucksInYard} subtitle="Current" />
        <StatCard label="Gate Queue" value={data.kpis.gateQueue} subtitle="Waiting" />
        <StatCard label="Recent Gate Activities" value={data.kpis.recentGateActivities} subtitle="Last 24 hours" />
        <StatCard label="Available Docks" value={data.kpis.availableDocks} subtitle="Ready" />
        <StatCard label="Upcoming Appointments" value={data.kpis.upcomingAppointments} subtitle="Next window" />
      </div>

      <div className="grid2">
        <DashboardCard title="Yard Map Overview" description="High-level yard visualization.">
          <YardMapPlaceholder />
        </DashboardCard>

        <DashboardCard title="Yard Capacity" description="Current utilization of yard spaces.">
          <DonutChart segments={yardSegments} />
        </DashboardCard>
      </div>

      <div className="grid2">
        <DashboardCard title="Vehicles Status" description="Overview of vehicles currently in the system.">
          <div className="tableWrap">
            <div className="tableHeader">
              <div>Vehicle</div>
              <div>Type</div>
              <div>Status</div>
              <div>Location</div>
              <div>Driver</div>
            </div>
            {data.vehicles.length === 0 ? (
              <div className="tableEmpty">No vehicles found.</div>
            ) : (
              data.vehicles.map((v) => (
                <div className="tableRow" key={v.vehicleNumber}>
                  <div className="cellStrong">{v.vehicleNumber}</div>
                  <div>{v.type}</div>
                  <div>
                    <Badge value={v.status} />
                  </div>
                  <div>{v.location}</div>
                  <div>{v.driver}</div>
                </div>
              ))
            )}
          </div>
        </DashboardCard>

        <div className="stack">
          <DashboardCard title="Appointments Overview" description="Distribution by status.">
            <BarChart bars={appointmentBars} />
          </DashboardCard>

          <DashboardCard title="Upcoming Appointments" description="Next scheduled appointments.">
            {data.upcomingAppointments.length === 0 ? (
              <div className="emptyState">No upcoming appointments.</div>
            ) : (
              <div className="apptList">
                {data.upcomingAppointments.map((a) => (
                  <div className="apptRow" key={a.id}>
                    <div className="apptMain">
                      <div className="apptTitle">
                        {a.vehicleNumber ?? 'Unassigned'}
                        <span className="apptDot">•</span>
                        {a.dockName ?? 'No dock'}
                      </div>
                      <div className="apptSub">{formatUtcRange(a.scheduledStartUtc, a.scheduledEndUtc)}</div>
                    </div>
                    <Badge value={a.status} />
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </div>
      </div>

      <DashboardCard title="Recent Activity Feed" description="Latest system events.">
        {data.recentActivity.length === 0 ? (
          <div className="emptyState">No recent activity.</div>
        ) : (
          <div className="activityList">
            {data.recentActivity.map((a) => (
              <div className="activityRow" key={a.id}>
                <div className="activityIcon" aria-hidden />
                <div className="activityMain">
                  <div className="activityTitle">{a.title}</div>
                  <div className="activityDesc">{a.description}</div>
                </div>
                <div className="activityMeta">{formatTimeAgo(a.occurredAtUtc)}</div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
