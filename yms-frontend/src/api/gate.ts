import { http } from './http';

export type GateActivityType = 'CheckIn' | 'CheckOut' | 'MovedToDock';

export type GateActivityDto = {
  id: string;
  type: GateActivityType;
  gateName: string;
  vehicleId: string | null;
  vehicleNumber: string | null;
  driverId: string | null;
  driverName: string | null;
  occurredAtUtc: string;
};

export type GateAuditEventDto = {
  id: string;
  action: string;
  outcome: string;
  actorUserId: string;
  actorRole: string;
  gateName: string;
  vehicleId: string | null;
  driverId: string | null;
  trailerNumber: string | null;
  sealNumber: string | null;
  dockOrParking: string | null;
  occurredAtUtc: string;
};

export type GateActionResultDto = {
  message: string;
  vehicleId: string | null;
  driverId: string | null;
  occurredAtUtc: string;
};

export type GateCheckInRequest = {
  gateName: string;
  vehicleNumber: string;
  driverName?: string | null;
  trailerNumber?: string | null;
  sealNumber?: string | null;
  dockOrParking?: string | null;
};

export type GateCheckOutRequest = GateCheckInRequest;

export type GateMoveToDockRequest = {
  gateName: string;
  vehicleNumber: string;
  dockOrParking: string;
};

export type GateSecurityEventRequest = {
  gateName: string;
  vehicleNumber: string;
  driverName?: string | null;
  eventType: string;
  severity: string;
  note?: string | null;
  trailerNumber?: string | null;
  sealNumber?: string | null;
};

export async function getGateActivities(take = 150): Promise<GateActivityDto[]> {
  return http<GateActivityDto[]>(`/api/gate/activities?take=${encodeURIComponent(String(take))}`);
}

export async function getGateAudit(take = 250): Promise<GateAuditEventDto[]> {
  return http<GateAuditEventDto[]>(`/api/gate/audit?take=${encodeURIComponent(String(take))}`);
}

export async function gateCheckIn(payload: GateCheckInRequest): Promise<GateActionResultDto> {
  return http<GateActionResultDto>('/api/gate/check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function gateCheckOut(payload: GateCheckOutRequest): Promise<GateActionResultDto> {
  return http<GateActionResultDto>('/api/gate/check-out', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function gateMoveToDock(payload: GateMoveToDockRequest): Promise<GateActionResultDto> {
  return http<GateActionResultDto>('/api/gate/move-to-dock', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function gateSecurityEvent(payload: GateSecurityEventRequest): Promise<GateActionResultDto> {
  return http<GateActionResultDto>('/api/gate/security-event', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
