import { http } from './http';

export type DockStatus = 'Available' | 'Occupied' | 'Maintenance';

export type DockDto = {
  id: string;
  yardId: string;
  name: string;
  status: DockStatus;
  createdAtUtc: string;
};

export async function getDocks(params?: { yardId?: string; take?: number }): Promise<DockDto[]> {
  const qs = new URLSearchParams();
  if (params?.yardId) qs.set('yardId', params.yardId);
  if (params?.take) qs.set('take', String(params.take));

  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return http<DockDto[]>(`/api/docks${suffix}`);
}
