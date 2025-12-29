import { http } from './http';

export type DriverDto = {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  carrierId: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type CreateDriverDto = {
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiry: string;
  phone: string;
  email: string;
  carrierId: string;
  emergencyContact?: { name: string; phone: string; relationship: string };
};

export async function getDrivers(params?: { search?: string; isActive?: boolean; take?: number }): Promise<DriverDto[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive));
  if (params?.take) qs.set('take', String(params.take));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return http<DriverDto[]>(`/api/drivers${suffix}`);
}

export async function createDriver(payload: CreateDriverDto): Promise<DriverDto> {
  return http<DriverDto>('/api/drivers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
