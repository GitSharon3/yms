import { http } from './http';

export type AppointmentStatus = 'Scheduled' | 'Rescheduled' | 'CheckedIn' | 'Completed' | 'Missed' | 'Cancelled';
export type AppointmentPriority = 'Low' | 'Normal' | 'High' | 'Critical';

export type AppointmentHistoryItemDto = {
  status: AppointmentStatus;
  atUtc: string;
  note?: string;
};

export type AppointmentDto = {
  id: string;
  code: string;
  yardId: string;
  dockId: string | null;
  vehicleId: string | null;
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

export async function getAppointments(params?: {
  yardId?: string;
  dockId?: string;
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  fromUtc?: string;
  toUtc?: string;
  take?: number;
}): Promise<AppointmentDto[]> {
  const qs = new URLSearchParams();
  if (params?.yardId) qs.set('yardId', params.yardId);
  if (params?.dockId) qs.set('dockId', params.dockId);
  if (params?.status) qs.set('status', params.status);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.fromUtc) qs.set('fromUtc', params.fromUtc);
  if (params?.toUtc) qs.set('toUtc', params.toUtc);
  if (params?.take) qs.set('take', String(params.take));

  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return http<AppointmentDto[]>(`/api/appointments${suffix}`);
}

export type CreateAppointmentRequestDto = {
  yardId: string;
  dockId?: string | null;
  vehicleId?: string | null;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  cargoType: string;
  priority: AppointmentPriority;
  notes?: string | null;
};

export async function createAppointment(payload: CreateAppointmentRequestDto): Promise<AppointmentDto> {
  return http<AppointmentDto>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type UpdateAppointmentRequestDto = {
  dockId?: string | null;
  vehicleId?: string | null;
  scheduledStartUtc?: string;
  scheduledEndUtc?: string;
  cargoType?: string | null;
  priority?: AppointmentPriority;
  status?: AppointmentStatus;
  notes?: string | null;
  actionNote?: string | null;
};

export async function updateAppointment(id: string, payload: UpdateAppointmentRequestDto): Promise<AppointmentDto> {
  return http<AppointmentDto>(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  await http<void>(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
