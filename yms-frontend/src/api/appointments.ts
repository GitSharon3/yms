import { http } from './http';

export type AppointmentStatus = 'Scheduled' | 'CheckedIn' | 'Completed' | 'Missed' | 'Cancelled';

export type AppointmentHistoryItemDto = {
  status: AppointmentStatus;
  atUtc: string;
  note?: string;
};

export type AppointmentDto = {
  id: string;
  status: AppointmentStatus;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  truckId: string;
  driver: string;
  dock: string;
  location: string;
  type: string;
  notes?: string;
  history: AppointmentHistoryItemDto[];
};

export async function getAppointments(): Promise<AppointmentDto[]> {
  return http<AppointmentDto[]>('/api/appointments');
}
