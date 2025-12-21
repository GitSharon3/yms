import { http } from './http';

export type DashboardKpisDto = {
  trucksInYard: number;
  gateQueue: number;
  recentGateActivities: number;
  availableDocks: number;
  upcomingAppointments: number;
};

export type YardCapacityDto = {
  allocated: number;
  available: number;
  maintenance: number;
};

export type VehicleStatusRowDto = {
  vehicleNumber: string;
  type: string;
  status: string;
  location: string;
  driver: string;
};

export type AppointmentStatusDistributionDto = {
  scheduled: number;
  checkedIn: number;
  completed: number;
  missed: number;
  cancelled: number;
};

export type UpcomingAppointmentDto = {
  id: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  status: string;
  vehicleNumber?: string | null;
  dockName?: string | null;
};

export type ActivityFeedItemDto = {
  id: string;
  occurredAtUtc: string;
  title: string;
  description: string;
  type: string;
};

export type DashboardOverviewDto = {
  kpis: DashboardKpisDto;
  yardCapacity: YardCapacityDto;
  vehicles: VehicleStatusRowDto[];
  appointmentsDistribution: AppointmentStatusDistributionDto;
  upcomingAppointments: UpcomingAppointmentDto[];
  recentActivity: ActivityFeedItemDto[];
};

export async function getDashboardOverview(): Promise<DashboardOverviewDto> {
  return http<DashboardOverviewDto>('/api/dashboard/overview');
}
