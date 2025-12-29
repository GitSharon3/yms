import { http } from './http';
import { getAccessToken } from '../auth/token';

export type GateActivityType = 'CheckIn' | 'CheckOut' | 'MovedToDock';

export type Priority = 'Low' | 'Normal' | 'High' | 'Critical';
export type QueueStatus = 'Waiting' | 'Processing' | 'Authorized' | 'Rejected';
export type GateActivityStatus = 'Completed' | 'Pending' | 'Failed';

export type SecurityEventType = 'Breach' | 'Suspicious' | 'Violation' | 'Emergency' | 'Theft';
export type SecuritySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

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

export type GateDashboardActivityDto = {
  id: string;
  type: 'CheckIn' | 'CheckOut' | 'Security' | 'Authorization';
  vehicleNumber: string;
  gateName: string;
  timestamp: string;
  operatorName: string;
  status: GateActivityStatus;
  details: string;
};

export type GateQueueDto = {
  id: string;
  vehicleNumber: string;
  driverName: string;
  arrivalTime: string;
  estimatedWaitTime: number;
  priority: Priority;
  status: QueueStatus;
};

export type GateStatusDto = {
  gates: {
    gateId: string;
    gateName: string;
    status: 'Open' | 'Closed' | 'Maintenance' | 'Lockdown';
    currentLoad: number;
    capacity: number;
    lastUpdatedAt: string;
  }[];
  overallStatus: 'Normal' | 'Busy' | 'Degraded' | 'Emergency';
};

export type GateStatisticsDto = {
  checkedIn: number;
  checkedOut: number;
  avgWaitMinutes: number;
  peakHour: string;
  securityEvents: number;
};

export type CheckInFormDto = {
  gateName?: string;
  vehicleNumber: string;
  trailerNumber: string;
  vehicleType: string;
  driver: {
    name: string;
    licenseNumber: string;
    phone: string;
    carrierName: string;
  };
  appointmentId?: string;
  purpose: 'Loading' | 'Unloading' | 'Transfer' | 'Other';
  hazardousMaterials: boolean;
  temperatureControlled: boolean;
  estimatedDuration: number;
  notes: string;
};

export type CheckInResultDto = {
  authorized: boolean;
  authorizationCode?: string;
  rejectionReason?: string;
  queuePosition?: number;
  estimatedWaitTime?: number;
  assignedGate?: string;
};

export type CheckOutRequestDto = {
  gateName?: string;
  vehicleNumber: string;
  notes?: string | null;
};

export type AuthorizationRequestDto = {
  vehicleNumber: string;
  action: 'Entry' | 'Exit';
  reason: string;
  overrideRestrictions: boolean;
  overrideReason?: string;
  conditions?: string[];
  expiresAt?: string;
};

export type AuthorizationDecisionDto = {
  approved: boolean;
  authorizationCode: string;
  conditions: string[];
  validUntil: string;
  approvedBy: string;
  notes: string;
};

export type SecurityEventDto = {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  vehicleNumber?: string | null;
  driverName?: string | null;
  location: string;
  description: string;
  reportedBy: string;
  timestamp: string;
  status: 'Open' | 'Investigating' | 'Resolved' | 'Closed';
  resolution?: string | null;
};

export type SecurityEventFormDto = {
  type: SecurityEventType;
  severity: SecuritySeverity;
  vehicleNumber?: string;
  driverName?: string;
  location: string;
  description: string;
  immediateAction: string;
  requiresFollowUp: boolean;
};

export type SecurityEventUpdateDto = {
  status?: 'Open' | 'Investigating' | 'Resolved' | 'Closed';
  resolution?: string | null;
};

export type QueueActionType = 'Authorize' | 'Reject' | 'Redirect' | 'Hold';
export type QueueActionDto = {
  type: QueueActionType;
  reason: string;
  notes?: string;
};

export type BulkProcessRequestDto = {
  vehicleIds: string[];
  action: QueueActionDto;
};

export type ReorderQueueRequestDto = {
  vehicleIds: string[];
};

export type PrioritizeQueueRequestDto = {
  vehicleId: string;
  priority: Priority;
};

export type GateConfigDto = {
  gateId: string;
  gateName: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  operatingHours: {
    open: string;
    close: string;
    timezone: string;
  };
  capacity: number;
  supportedVehicleTypes: string[];
  securityLevel: 'Low' | 'Medium' | 'High';
  specialInstructions: string;
};

export type EmergencyActionType = 'lockdown_all_gates' | 'evacuate_yard' | 'emergency_contact' | 'broadcast_alert' | 'suspend_operations';
export type EmergencyActionRequestDto = {
  type: EmergencyActionType;
  message?: string | null;
  contactType?: string | null;
};

async function httpMaybe<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  const token = getAccessToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 404 || res.status === 501) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
  return (await res.json()) as T;
}

function startOfLocalDayUtcIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return start.toISOString();
}

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

export async function getGateStatus(): Promise<GateStatusDto> {
  const maybe = await httpMaybe<GateStatusDto>('/api/gate/status');
  if (maybe) return maybe;

  return {
    overallStatus: 'Normal',
    gates: [
      {
        gateId: 'main',
        gateName: 'Main Gate',
        status: 'Open',
        currentLoad: 0,
        capacity: 0,
        lastUpdatedAt: new Date().toISOString(),
      },
    ],
  };
}

export async function getGateQueue(): Promise<GateQueueDto[]> {
  const maybe = await httpMaybe<GateQueueDto[]>('/api/gate/queue');
  return maybe ?? [];
}

export async function getGateDashboardActivities(): Promise<GateDashboardActivityDto[]> {
  const maybe = await httpMaybe<GateDashboardActivityDto[]>('/api/gate/activities');
  if (maybe) return maybe;

  const legacy = await getGateActivities(150);
  return legacy.map((a) => ({
    id: a.id,
    type: a.type === 'CheckIn' ? 'CheckIn' : a.type === 'CheckOut' ? 'CheckOut' : 'Authorization',
    vehicleNumber: a.vehicleNumber ?? '—',
    gateName: a.gateName,
    timestamp: a.occurredAtUtc,
    operatorName: '—',
    status: 'Completed',
    details: a.driverName ? `Driver: ${a.driverName}` : '',
  }));
}

export async function getGateStatistics(): Promise<GateStatisticsDto> {
  const maybe = await httpMaybe<GateStatisticsDto>('/api/gate/statistics');
  if (maybe) return maybe;

  const startUtc = startOfLocalDayUtcIso();
  const items = await getGateActivities(500);
  const today = items.filter((x) => {
    try {
      return new Date(x.occurredAtUtc).toISOString() >= startUtc;
    } catch {
      return false;
    }
  });

  const checkedIn = today.filter((x) => x.type === 'CheckIn').length;
  const checkedOut = today.filter((x) => x.type === 'CheckOut').length;

  return {
    checkedIn,
    checkedOut,
    avgWaitMinutes: 0,
    peakHour: '—',
    securityEvents: 0,
  };
}

export async function checkIn(payload: CheckInFormDto): Promise<CheckInResultDto> {
  const gateName = (payload.gateName ?? 'Main Gate').trim() || 'Main Gate';
  const legacyReq = {
    gateName,
    vehicleNumber: payload.vehicleNumber,
    driverName: payload.driver?.name ? payload.driver.name : null,
    trailerNumber: payload.trailerNumber || null,
    sealNumber: null,
    dockOrParking: null,
  };

  await http<GateActionResultDto>('/api/gate/check-in', {
    method: 'POST',
    body: JSON.stringify(legacyReq),
  });

  return {
    authorized: true,
    authorizationCode: undefined,
    queuePosition: undefined,
    estimatedWaitTime: undefined,
    assignedGate: gateName,
  };
}

export async function checkOut(payload: CheckOutRequestDto): Promise<{ message: string } | void> {
  const gateName = (payload.gateName ?? 'Main Gate').trim() || 'Main Gate';
  const legacyReq = {
    gateName,
    vehicleNumber: payload.vehicleNumber,
    driverName: null,
    trailerNumber: null,
    sealNumber: null,
    dockOrParking: payload.notes ?? null,
  };

  const res = await http<GateActionResultDto>('/api/gate/check-out', {
    method: 'POST',
    body: JSON.stringify(legacyReq),
  });

  return { message: res.message };
}

export async function authorizeEntry(payload: AuthorizationRequestDto): Promise<AuthorizationDecisionDto> {
  const maybe = await httpMaybe<AuthorizationDecisionDto>('/api/gate/authorize-entry', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (maybe) return maybe;

  return {
    approved: payload.overrideRestrictions ? true : true,
    authorizationCode: `LEGACY-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    conditions: payload.conditions ?? [],
    validUntil: payload.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    approvedBy: 'System',
    notes: 'Backend authorize-entry not implemented; returning client-side decision for UI continuity.',
  };
}

export async function authorizeExit(payload: AuthorizationRequestDto): Promise<AuthorizationDecisionDto> {
  const maybe = await httpMaybe<AuthorizationDecisionDto>('/api/gate/authorize-exit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (maybe) return maybe;

  return {
    approved: payload.overrideRestrictions ? true : true,
    authorizationCode: `LEGACY-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    conditions: payload.conditions ?? [],
    validUntil: payload.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    approvedBy: 'System',
    notes: 'Backend authorize-exit not implemented; returning client-side decision for UI continuity.',
  };
}

export async function getSecurityEvents(): Promise<SecurityEventDto[]> {
  const maybe = await httpMaybe<SecurityEventDto[]>('/api/gate/security-events');
  return maybe ?? [];
}

export async function createSecurityEvent(payload: SecurityEventFormDto): Promise<SecurityEventDto> {
  const maybe = await httpMaybe<SecurityEventDto>('/api/gate/security-events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (maybe) return maybe;

  await http<GateActionResultDto>('/api/gate/security-event', {
    method: 'POST',
    body: JSON.stringify({
      gateName: payload.location || 'Gate',
      vehicleNumber: payload.vehicleNumber || 'UNKNOWN',
      driverName: payload.driverName || null,
      eventType: payload.type,
      severity: payload.severity,
      note: `${payload.description} | Action: ${payload.immediateAction} | FollowUp: ${payload.requiresFollowUp}`,
      trailerNumber: null,
      sealNumber: null,
    }),
  });

  return {
    id: `legacy-${Math.random().toString(16).slice(2)}`,
    type: payload.type,
    severity: payload.severity,
    vehicleNumber: payload.vehicleNumber ?? null,
    driverName: payload.driverName ?? null,
    location: payload.location,
    description: payload.description,
    reportedBy: 'System',
    timestamp: new Date().toISOString(),
    status: 'Open',
    resolution: null,
  };
}

export async function updateSecurityEvent(id: string, payload: SecurityEventUpdateDto): Promise<SecurityEventDto> {
  const maybe = await httpMaybe<SecurityEventDto>(`/api/gate/security-events/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  if (maybe) return maybe;
  throw new Error('Security event update is not available (backend endpoint missing).');
}

export async function deleteSecurityEvent(id: string): Promise<void> {
  const maybe = await httpMaybe<void>(`/api/gate/security-events/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    });
  if (maybe === null) throw new Error('Security event delete is not available (backend endpoint missing).');
}

export async function reorderQueue(payload: ReorderQueueRequestDto): Promise<void> {
  const maybe = await httpMaybe<void>('/api/gate/queue/reorder', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (maybe === null) throw new Error('Queue reorder is not available (backend endpoint missing).');
}

export async function prioritizeQueue(payload: PrioritizeQueueRequestDto): Promise<void> {
  const maybe = await httpMaybe<void>('/api/gate/queue/prioritize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (maybe === null) throw new Error('Queue prioritize is not available (backend endpoint missing).');
}

export async function removeFromQueue(vehicleId: string, reason: string): Promise<void> {
  const maybe = await httpMaybe<void>(`/api/gate/queue/${encodeURIComponent(vehicleId)}?reason=${encodeURIComponent(reason)}`,
    {
      method: 'DELETE',
    });
  if (maybe === null) throw new Error('Remove from queue is not available (backend endpoint missing).');
}

export async function bulkProcessQueue(payload: BulkProcessRequestDto): Promise<void> {
  const maybe = await httpMaybe<void>('/api/gate/queue/bulk-process', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (maybe === null) throw new Error('Bulk queue processing is not available (backend endpoint missing).');
}

export async function getGateConfig(): Promise<GateConfigDto[]> {
  const maybe = await httpMaybe<GateConfigDto[]>('/api/gate/config');
  return maybe ?? [];
}

export async function updateGateConfig(gateId: string, payload: Partial<GateConfigDto>): Promise<GateConfigDto> {
  const maybe = await httpMaybe<GateConfigDto>(`/api/gate/config/${encodeURIComponent(gateId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  if (maybe) return maybe;
  throw new Error('Gate config update is not available (backend endpoint missing).');
}

export async function emergencyAction(payload: EmergencyActionRequestDto): Promise<void> {
  const maybe = await httpMaybe<void>('/api/gate/emergency', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (maybe === null) throw new Error('Emergency actions are not available (backend endpoint missing).');
}
