import { http } from './http';

export type VehicleDto = {
  id: string;
  vehicleNumber: string;
  trailerNumber: string | null;
  type: string;
  status: string;
  isOnHold: boolean;
  holdReason: string | null;
  carrierName?: string | null;
  licensePlate?: string | null;
  vin?: string | null;
  vehicleWeight?: number | null;
  vehicleDimensions?: { length: number; width: number; height: number } | null;
  hazardousMaterials?: boolean | null;
  temperatureControlled?: boolean | null;
  notes?: string | null;
  nextAppointmentId: string | null;
  nextAppointmentStartUtc: string | null;
  nextAppointmentEndUtc: string | null;
  nextAppointmentPriority: string | null;
  nextAppointmentStatus: string | null;
  yardSectionId: string | null;
  yardSectionName: string | null;
  dockId: string | null;
  dockName: string | null;
  driverId: string | null;
  driverName: string | null;
  createdAtUtc: string;
  updatedAt: string | null;
};

export type VehicleAssignmentDto = {
  id: string;
  vehicleId: string;
  userId: string;
  username: string;
  assignmentRole: string;
  isActive: boolean;
  assignedAtUtc: string;
  unassignedAtUtc: string | null;
};

export type AssignVehicleRequest = {
  userId: string;
  assignmentRole: 'Operator' | 'Jockey';
};

export type SetVehicleHoldRequest = {
  isOnHold: boolean;
  holdReason?: string | null;
};

export type UpdateVehicleLocationRequest = {
  yardSectionId?: string | null;
  dockId?: string | null;
};

export type UpdateVehicleStatusRequest = {
  status: string;
};

export type AssignVehicleDriverRequest = {
  driverId: string | null;
};

export type AssignVehicleDriverUserRequest = {
  userId: string | null;
};

export type BulkUpdateVehicleStatusRequest = {
  vehicleIds: string[];
  status: string;
};

export type BulkUpdateVehicleHoldRequest = {
  vehicleIds: string[];
  isOnHold: boolean;
  holdReason?: string | null;
};

export async function getVehicles(params?: {
  status?: string;
  yardSectionId?: string;
  dockId?: string;
  onHold?: boolean;
  appointmentPriority?: string;
  appointmentFromUtc?: string;
  appointmentToUtc?: string;
  take?: number;
}): Promise<VehicleDto[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.yardSectionId) qs.set('yardSectionId', params.yardSectionId);
  if (params?.dockId) qs.set('dockId', params.dockId);
  if (params?.onHold !== undefined) qs.set('onHold', String(params.onHold));
  if (params?.appointmentPriority) qs.set('appointmentPriority', params.appointmentPriority);
  if (params?.appointmentFromUtc) qs.set('appointmentFromUtc', params.appointmentFromUtc);
  if (params?.appointmentToUtc) qs.set('appointmentToUtc', params.appointmentToUtc);
  if (params?.take) qs.set('take', String(params.take));

  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return http<VehicleDto[]>(`/api/vehicles${suffix}`);
}

export async function getVehicleById(id: string): Promise<VehicleDto> {
  return http<VehicleDto>(`/api/vehicles/${encodeURIComponent(id)}`);
}

export async function getVehicleAssignments(id: string): Promise<VehicleAssignmentDto[]> {
  return http<VehicleAssignmentDto[]>(`/api/vehicles/${encodeURIComponent(id)}/assignments`);
}

export async function assignVehicle(id: string, payload: AssignVehicleRequest): Promise<void> {
  await http<void>(`/api/vehicles/${encodeURIComponent(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function unassignVehicle(id: string, userId: string): Promise<void> {
  await http<void>(`/api/vehicles/${encodeURIComponent(id)}/unassign?userId=${encodeURIComponent(userId)}`, {
    method: 'POST',
  });
}

export async function setVehicleHold(id: string, payload: SetVehicleHoldRequest): Promise<VehicleDto> {
  return http<VehicleDto>(`/api/vehicles/${encodeURIComponent(id)}/hold`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateVehicleLocation(id: string, payload: UpdateVehicleLocationRequest): Promise<VehicleDto> {
  return http<VehicleDto>(`/api/vehicles/${encodeURIComponent(id)}/location`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type CreateVehicleDto = {
  vehicleNumber: string;
  trailerNumber?: string | null;
  type: string;
  driverId?: string | null;
  carrierName?: string;
  licensePlate?: string;
  vin?: string;
  vehicleWeight?: number;
  vehicleDimensions?: { length: number; width: number; height: number };
  hazardousMaterials?: boolean;
  temperatureControlled?: boolean;
  notes?: string;
};

export type UpdateVehicleDto = Partial<CreateVehicleDto>;

export async function createVehicle(payload: CreateVehicleDto): Promise<VehicleDto> {
  return http<VehicleDto>('/api/vehicles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateVehicle(id: string, payload: UpdateVehicleDto): Promise<VehicleDto> {
  return http<VehicleDto>(`/api/vehicles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  await http<void>(`/api/vehicles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateVehicleStatus(id: string, payload: UpdateVehicleStatusRequest): Promise<VehicleDto> {
  return http<VehicleDto>(`/api/vehicles/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateVehicleDriver(id: string, payload: AssignVehicleDriverRequest): Promise<VehicleDto> {
  return http<VehicleDto>(`/api/vehicles/${encodeURIComponent(id)}/driver`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateVehicleDriverUser(id: string, payload: AssignVehicleDriverUserRequest): Promise<VehicleDto> {
  return http<VehicleDto>(`/api/vehicles/${encodeURIComponent(id)}/driver-user`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function bulkUpdateVehicleStatus(payload: BulkUpdateVehicleStatusRequest): Promise<VehicleDto[]> {
  return http<VehicleDto[]>('/api/vehicles/bulk-status', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bulkUpdateVehicleHold(payload: BulkUpdateVehicleHoldRequest): Promise<VehicleDto[]> {
  return http<VehicleDto[]>('/api/vehicles/bulk-hold', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getVehicleAudit(id: string, take = 200) {
  return http<unknown[]>(`/api/vehicles/${encodeURIComponent(id)}/audit?take=${encodeURIComponent(String(take))}`);
}

export type VehicleAuditLogDto = {
  id: string;
  vehicleId: string;
  actorUserId: string;
  actorRole: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  fromIsOnHold: boolean | null;
  toIsOnHold: boolean | null;
  fromDockId: string | null;
  toDockId: string | null;
  fromYardSectionId: string | null;
  toYardSectionId: string | null;
  detailsJson: string | null;
  occurredAtUtc: string;
};

export async function getVehicleTimeline(id: string, take = 250): Promise<VehicleAuditLogDto[]> {
  return http<VehicleAuditLogDto[]>(`/api/vehicles/${encodeURIComponent(id)}/timeline?take=${encodeURIComponent(String(take))}`);
}
