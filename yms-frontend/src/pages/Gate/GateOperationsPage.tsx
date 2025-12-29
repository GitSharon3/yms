import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { hasGatePermission } from '../../auth/permissions';
import { Badge } from '../Dashboard/components/Badge';
import { DashboardCard } from '../Dashboard/components/DashboardCard';
import * as gateApi from '../../api/gate';

import './GateOperationsPage.css';

type Priority = 'Low' | 'Normal' | 'High' | 'Critical';
type QueueStatus = 'Waiting' | 'Processing' | 'Authorized' | 'Rejected';
type GateActivityStatus = 'Completed' | 'Pending' | 'Failed';

type GateSecurityEventType = 'Breach' | 'Suspicious' | 'Violation' | 'Emergency' | 'Theft';
type SecuritySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

type GateOpTab =
  | 'dashboard'
  | 'check-in'
  | 'check-out'
  | 'authorization'
  | 'security'
  | 'queue'
  | 'config'
  | 'audit'
  | 'emergency';

export interface GateDashboard {
  currentQueue: GateQueue[];
  recentActivities: GateActivity[];
  gateStatus: GateStatus;
  securityEvents: SecurityEvent[];
  todayStatistics: GateStatistics;
}

export interface GateQueue {
  id: string;
  vehicleNumber: string;
  driverName: string;
  arrivalTime: string;
  estimatedWaitTime: number;
  priority: Priority;
  status: QueueStatus;
}

export interface GateActivity {
  id: string;
  type: 'CheckIn' | 'CheckOut' | 'Security' | 'Authorization';
  vehicleNumber: string;
  gateName: string;
  timestamp: string;
  operatorName: string;
  status: GateActivityStatus;
  details: string;
}

export interface GateStatus {
  gates: {
    gateId: string;
    gateName: string;
    status: 'Open' | 'Closed' | 'Maintenance' | 'Lockdown';
    currentLoad: number;
    capacity: number;
    lastUpdatedAt: string;
  }[];
  overallStatus: 'Normal' | 'Busy' | 'Degraded' | 'Emergency';
}

export interface GateStatistics {
  checkedIn: number;
  checkedOut: number;
  avgWaitMinutes: number;
  peakHour: string;
  securityEvents: number;
}

export interface CheckInForm {
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
}

export interface CheckInResult {
  authorized: boolean;
  authorizationCode?: string;
  rejectionReason?: string;
  queuePosition?: number;
  estimatedWaitTime?: number;
  assignedGate?: string;
}

export interface AuthorizationRequest {
  vehicleNumber: string;
  action: 'Entry' | 'Exit';
  reason: string;
  overrideRestrictions: boolean;
  overrideReason?: string;
  conditions?: string[];
  expiresAt?: string;
}

export interface AuthorizationDecision {
  approved: boolean;
  authorizationCode: string;
  conditions: string[];
  validUntil: string;
  approvedBy: string;
  notes: string;
}

export interface SecurityEvent {
  id: string;
  type: GateSecurityEventType;
  severity: SecuritySeverity;
  vehicleNumber?: string;
  driverName?: string;
  location: string;
  description: string;
  reportedBy: string;
  timestamp: string;
  status: 'Open' | 'Investigating' | 'Resolved' | 'Closed';
  resolution?: string;
}

export interface SecurityEventForm {
  type: GateSecurityEventType;
  severity: SecuritySeverity;
  vehicleNumber?: string;
  driverName?: string;
  location: string;
  description: string;
  immediateAction: string;
  requiresFollowUp: boolean;
}

export interface GateConfig {
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
}

function formatWhen(utc: string) {
  try {
    return new Date(utc).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return utc;
  }
}

function safeString(v: string | null | undefined) {
  return (v ?? '').trim();
}

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 50,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'min(980px, 100%)',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ fontWeight: 950, color: 'rgba(15, 23, 42, 0.9)' }}>{title}</div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="gateBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div style={{ padding: '1rem' }}>{children}</div>
      </div>
    </div>
  );
}

function GateStatusIndicator({ status }: { status: GateStatus | null }) {
  if (!status) return <div className="gateMuted">No gate status available.</div>;

  return (
    <div className="gateFeed">
      <div className="gateFeedItem">
        <div>
          <div className="gateFeedTitle">Overall Status</div>
          <div className="gateFeedMeta">Last update: {status.gates[0]?.lastUpdatedAt ? formatWhen(status.gates[0].lastUpdatedAt) : '—'}</div>
        </div>
        <Badge value={status.overallStatus} />
      </div>
      {status.gates.map((g) => (
        <div key={g.gateId} className="gateFeedItem">
          <div>
            <div className="gateFeedTitle">{g.gateName}</div>
            <div className="gateFeedMeta">
              Load: {g.currentLoad}/{g.capacity}
            </div>
          </div>
          <Badge value={g.status} />
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({ items }: { items: GateActivity[] }) {
  return (
    <div className="gateFeed">
      {items.length === 0 ? <div className="gateMuted">No recent activity.</div> : null}
      {items.map((a) => (
        <div key={a.id} className="gateFeedItem">
          <div>
            <div className="gateFeedTitle">
              {a.type} • {a.vehicleNumber}
            </div>
            <div className="gateFeedMeta">
              Gate: {a.gateName} • {a.operatorName} • {formatWhen(a.timestamp)}
            </div>
            <div className="gateFeedMeta">{a.details}</div>
          </div>
          <Badge value={a.status} />
        </div>
      ))}
    </div>
  );
}

function ActivityTimeline({ items }: { items: GateActivity[] }) {
  const sorted = useMemo(() => items.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [items]);
  return (
    <div className="gateFeed">
      {sorted.length === 0 ? <div className="gateMuted">No audit events.</div> : null}
      {sorted.map((e) => (
        <div key={e.id} className="gateFeedItem">
          <div>
            <div className="gateFeedTitle">{formatWhen(e.timestamp)}</div>
            <div className="gateFeedMeta">
              {e.type} • {e.vehicleNumber} • {e.gateName} • {e.operatorName}
            </div>
            <div className="gateFeedMeta">{e.details}</div>
          </div>
          <Badge value={e.status} />
        </div>
      ))}
    </div>
  );
}

function QueueItemRow({
  item,
  selected,
  onToggle,
  onPrioritize,
  onRemove,
}: {
  item: GateQueue;
  selected: boolean;
  onToggle: () => void;
  onPrioritize: (p: Priority) => void;
  onRemove: (reason: string) => void;
}) {
  return (
    <div className="gateFeedItem" style={{ gridTemplateColumns: 'auto 1fr auto', alignItems: 'center' }}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <div>
        <div className="gateFeedTitle">
          {item.vehicleNumber} • {item.driverName}
        </div>
        <div className="gateFeedMeta">
          Arrived: {formatWhen(item.arrivalTime)} • ETA wait: {item.estimatedWaitTime}m
        </div>
        <div className="gateFeedMeta">
          Priority: {item.priority} • Status: {item.status}
        </div>
      </div>
      <div className="gateActions" style={{ justifyContent: 'flex-end' }}>
        <select className="gateSelect" value={item.priority} onChange={(e) => onPrioritize(e.target.value as Priority)}>
          <option value="Low">Low</option>
          <option value="Normal">Normal</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <button
          className="gateBtn gateBtnDanger"
          onClick={() => {
            const reason = window.prompt('Remove from queue - reason?') ?? '';
            if (reason.trim()) onRemove(reason.trim());
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function SecurityEventFormPanel({
  value,
  onChange,
}: {
  value: SecurityEventForm;
  onChange: (next: SecurityEventForm) => void;
}) {
  return (
    <div className="gateFormGrid">
      <label className="gateField">
        <div className="gateLabel">Type</div>
        <select className="gateSelect" value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as GateSecurityEventType })}>
          <option value="Breach">Breach</option>
          <option value="Suspicious">Suspicious</option>
          <option value="Violation">Violation</option>
          <option value="Emergency">Emergency</option>
          <option value="Theft">Theft</option>
        </select>
      </label>

      <label className="gateField">
        <div className="gateLabel">Severity</div>
        <select className="gateSelect" value={value.severity} onChange={(e) => onChange({ ...value, severity: e.target.value as SecuritySeverity })}>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </label>

      <label className="gateField">
        <div className="gateLabel">Vehicle Number (optional)</div>
        <input className="gateInput" value={value.vehicleNumber ?? ''} onChange={(e) => onChange({ ...value, vehicleNumber: e.target.value })} />
      </label>

      <label className="gateField">
        <div className="gateLabel">Driver Name (optional)</div>
        <input className="gateInput" value={value.driverName ?? ''} onChange={(e) => onChange({ ...value, driverName: e.target.value })} />
      </label>

      <label className="gateField" style={{ gridColumn: '1 / -1' }}>
        <div className="gateLabel">Location</div>
        <input className="gateInput" value={value.location} onChange={(e) => onChange({ ...value, location: e.target.value })} placeholder="Gate A / Yard Zone 2" />
      </label>

      <label className="gateField" style={{ gridColumn: '1 / -1' }}>
        <div className="gateLabel">Description</div>
        <input className="gateInput" value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />
      </label>

      <label className="gateField" style={{ gridColumn: '1 / -1' }}>
        <div className="gateLabel">Immediate Action</div>
        <input className="gateInput" value={value.immediateAction} onChange={(e) => onChange({ ...value, immediateAction: e.target.value })} placeholder="What was done immediately?" />
      </label>

      <label className="gateField" style={{ flexDirection: 'row', gap: '0.6rem', alignItems: 'center' }}>
        <input type="checkbox" checked={value.requiresFollowUp} onChange={(e) => onChange({ ...value, requiresFollowUp: e.target.checked })} />
        <div className="gateLabel" style={{ margin: 0 }}>
          Requires follow-up
        </div>
      </label>
    </div>
  );
}

function EmergencyControlsPanel({
  disabled,
  onLockdown,
  onEvacuate,
  onSuspend,
  onBroadcast,
}: {
  disabled: boolean;
  onLockdown: () => void;
  onEvacuate: () => void;
  onSuspend: () => void;
  onBroadcast: (message: string) => void;
}) {
  return (
    <div className="gateCardBody">
      <div className="gateMuted">Use these controls only in emergencies. All actions are audited.</div>
      <div className="gateActions" style={{ justifyContent: 'flex-start' }}>
        <button className="gateBtn gateBtnDanger" disabled={disabled} onClick={onLockdown}>
          Lockdown All Gates
        </button>
        <button className="gateBtn gateBtnDanger" disabled={disabled} onClick={onEvacuate}>
          Evacuate Yard
        </button>
        <button className="gateBtn gateBtnDanger" disabled={disabled} onClick={onSuspend}>
          Suspend Operations
        </button>
        <button
          className="gateBtn"
          disabled={disabled}
          onClick={() => {
            const msg = window.prompt('Broadcast alert message:') ?? '';
            if (msg.trim()) onBroadcast(msg.trim());
          }}
        >
          Broadcast Alert
        </button>
      </div>
    </div>
  );
}

export function GateOperationsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const username = user?.username ?? 'User';

  const [gateName, setGateName] = useState('Main Gate');

  const canView = hasGatePermission(role, 'gate.view');
  const canCheckIn = hasGatePermission(role, 'gate.check_in');
  const canCheckOut = hasGatePermission(role, 'gate.check_out');
  const canSecurityEvent = hasGatePermission(role, 'gate.security_event');
  const canAuditView = hasGatePermission(role, 'gate.audit_view');

  const isAdmin = role === 'Admin';

  const [tab, setTab] = useState<GateOpTab>('dashboard');

  const [dashboard, setDashboard] = useState<GateDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkInForm, setCheckInForm] = useState<CheckInForm>(() => ({
    vehicleNumber: '',
    trailerNumber: '',
    vehicleType: 'Truck',
    driver: { name: '', licenseNumber: '', phone: '', carrierName: '' },
    appointmentId: undefined,
    purpose: 'Loading',
    hazardousMaterials: false,
    temperatureControlled: false,
    estimatedDuration: 60,
    notes: '',
  }));

  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);

  const [checkOutVehicleNumber, setCheckOutVehicleNumber] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRequest, setAuthRequest] = useState<AuthorizationRequest>(() => ({
    vehicleNumber: '',
    action: 'Entry',
    reason: '',
    overrideRestrictions: false,
    overrideReason: '',
    conditions: [],
    expiresAt: '',
  }));
  const [authDecision, setAuthDecision] = useState<AuthorizationDecision | null>(null);

  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityDraft, setSecurityDraft] = useState<SecurityEventForm>(() => ({
    type: 'Suspicious',
    severity: 'Medium',
    vehicleNumber: '',
    driverName: '',
    location: 'Main Gate',
    description: '',
    immediateAction: '',
    requiresFollowUp: true,
  }));

  const [selectedQueueIds, setSelectedQueueIds] = useState<Record<string, boolean>>({});

  const pollRef = useRef<number | null>(null);

  const selectedQueueList = useMemo(() => {
    const q = dashboard?.currentQueue ?? [];
    return q.filter((x) => selectedQueueIds[x.id]);
  }, [dashboard?.currentQueue, selectedQueueIds]);

  const refresh = async () => {
    if (!canView) return;

    setLoading(true);
    setError(null);
    try {
      const [status, queue, activities, events, stats] = await Promise.all([
        gateApi.getGateStatus(),
        gateApi.getGateQueue(),
        gateApi.getGateDashboardActivities(),
        gateApi.getSecurityEvents(),
        gateApi.getGateStatistics(),
      ]);

      const mappedQueue: GateQueue[] = (queue ?? []).map((q: gateApi.GateQueueDto) => ({
        id: q.id,
        vehicleNumber: q.vehicleNumber,
        driverName: q.driverName,
        arrivalTime: q.arrivalTime,
        estimatedWaitTime: q.estimatedWaitTime,
        priority: q.priority,
        status: q.status,
      }));

      const mappedActivities: GateActivity[] = (activities ?? []).map((a: gateApi.GateDashboardActivityDto) => ({
        id: a.id,
        type: a.type,
        vehicleNumber: a.vehicleNumber,
        gateName: a.gateName,
        timestamp: a.timestamp,
        operatorName: a.operatorName,
        status: a.status,
        details: a.details,
      }));

      const mappedEvents: SecurityEvent[] = (events ?? []).map((e: gateApi.SecurityEventDto) => ({
        id: e.id,
        type: e.type,
        severity: e.severity,
        vehicleNumber: e.vehicleNumber ?? undefined,
        driverName: e.driverName ?? undefined,
        location: e.location,
        description: e.description,
        reportedBy: e.reportedBy,
        timestamp: e.timestamp,
        status: e.status,
        resolution: e.resolution ?? undefined,
      }));

      setDashboard({
        currentQueue: mappedQueue,
        recentActivities: mappedActivities,
        gateStatus: status,
        securityEvents: mappedEvents,
        todayStatistics: stats,
      });

      setSelectedQueueIds((prev) => {
        const next: Record<string, boolean> = {};
        for (const item of mappedQueue) {
          next[item.id] = Boolean(prev[item.id]);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load gate dashboard');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    if (!canView) return;

    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      void refresh();
    }, 4000);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const visibleTabs = useMemo(() => {
    const items: { id: GateOpTab; label: string; requires?: boolean }[] = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'check-in', label: 'Check-In', requires: canCheckIn },
      { id: 'check-out', label: 'Check-Out', requires: canCheckOut },
      { id: 'queue', label: 'Queue', requires: canView },
      { id: 'authorization', label: 'Authorization', requires: canView },
      { id: 'security', label: 'Security', requires: canSecurityEvent },
      { id: 'config', label: 'Gate Config', requires: isAdmin },
      { id: 'audit', label: 'Audit', requires: canAuditView },
      { id: 'emergency', label: 'Emergency', requires: isAdmin },
    ];

    return items.filter((t) => t.requires !== false);
  }, [canAuditView, canCheckIn, canCheckOut, canSecurityEvent, canView, isAdmin]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) setTab('dashboard');
  }, [tab, visibleTabs]);

  const queue = dashboard?.currentQueue ?? [];
  const activities = dashboard?.recentActivities ?? [];
  const events = dashboard?.securityEvents ?? [];

  if (!canView) {
    return (
      <div className="ymsPage">
        <div className="ymsPageHeader">
          <div>
            <div className="ymsPageTitle">Gate Operations</div>
            <div className="ymsPageSub">You do not have access to Gate Operations.</div>
          </div>
        </div>
      </div>
    );
  }

  const bulkDisabled = busy || selectedQueueList.length === 0;

  const doBulk = async (action: gateApi.QueueActionType) => {
    window.alert('Queue bulk actions are not available yet in the current backend.');
    void action;
    return;
  };

  const doPrioritize = async (queueId: string, priority: Priority) => {
    window.alert('Queue prioritization is not available yet in the current backend.');
    void queueId;
    void priority;
    return;
  };

  const doRemoveFromQueue = async (queueId: string, reason: string) => {
    window.alert('Queue removal is not available yet in the current backend.');
    void queueId;
    void reason;
    return;
  };

  const doReorder = async () => {
    window.alert('Queue reorder is not available yet in the current backend.');
    return;
  };

  const doCheckIn = async () => {
    setBusy(true);
    setError(null);
    setCheckInResult(null);
    try {
      const res = await gateApi.checkIn({ ...checkInForm, gateName });
      setCheckInResult(res);
      setCheckInForm((p) => ({
        ...p,
        vehicleNumber: '',
        trailerNumber: '',
        driver: { ...p.driver, name: '', licenseNumber: '', phone: '', carrierName: '' },
        appointmentId: undefined,
        notes: '',
      }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  };

  const doCheckOut = async () => {
    if (!checkOutVehicleNumber.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await gateApi.checkOut({ gateName, vehicleNumber: checkOutVehicleNumber.trim(), notes: safeString(checkOutNotes) || null });
      setCheckOutVehicleNumber('');
      setCheckOutNotes('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-out failed');
    } finally {
      setBusy(false);
    }
  };

  const openAuthFor = (vehicleNumber: string, action: 'Entry' | 'Exit') => {
    setAuthDecision(null);
    setAuthRequest({
      vehicleNumber,
      action,
      reason: '',
      overrideRestrictions: false,
      overrideReason: '',
      conditions: [],
      expiresAt: '',
    });
    setAuthModalOpen(true);
  };

  const submitAuth = async () => {
    if (!authRequest.vehicleNumber.trim() || !authRequest.reason.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const decision =
        authRequest.action === 'Entry'
          ? await gateApi.authorizeEntry(authRequest)
          : await gateApi.authorizeExit(authRequest);

      setAuthDecision(decision);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authorization failed');
    } finally {
      setBusy(false);
    }
  };

  const submitSecurityEvent = async () => {
    if (!securityDraft.location.trim() || !securityDraft.description.trim() || !securityDraft.immediateAction.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await gateApi.createSecurityEvent({
        ...securityDraft,
        location: securityDraft.location || gateName,
        vehicleNumber: safeString(securityDraft.vehicleNumber) || undefined,
        driverName: safeString(securityDraft.driverName) || undefined,
      });

      setSecurityModalOpen(false);
      setSecurityDraft((p) => ({ ...p, vehicleNumber: '', driverName: '', description: '', immediateAction: '' }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create security event');
    } finally {
      setBusy(false);
    }
  };

  const updateSecurityStatus = async (id: string, status: SecurityEvent['status']) => {
    window.alert('Updating security events is not available yet in the current backend.');
    void id;
    void status;
    return;
  };

  const deleteSecurityEvent = async (id: string) => {
    window.alert('Deleting security events is not available yet in the current backend.');
    void id;
    return;
  };

  const [config] = useState<GateConfig[] | null>(null);
  const [configLoading] = useState(false);

  const refreshConfig = async () => {
    if (!isAdmin) return;

    window.alert('Gate configuration is not available yet in the current backend.');
    return;
  };

  const saveConfig = async (gateId: string, patch: Partial<GateConfig>) => {
    window.alert('Gate configuration is not available yet in the current backend.');
    void gateId;
    void patch;
    return;
  };

  const doEmergency = async (kind: gateApi.EmergencyActionType, message?: string) => {
    if (!isAdmin) return;

    window.alert('Emergency controls are not available yet in the current backend.');
    void kind;
    void message;
    return;
  };

  return (
    <div className="ymsPage">
      <div className="ymsPageHeader">
        <div>
          <div className="ymsPageTitle">Gate Operations</div>
          <div className="ymsPageSub">Real-time gate queue, security events, authorization overrides, and audit trail.</div>
        </div>
        <div className="gateActions">
          <div className="gateMuted">Signed in: {username} ({role || 'Unknown'})</div>
          <label className="gateField" style={{ minWidth: 240 }}>
            <div className="gateLabel">Gate</div>
            <input className="gateInput" value={gateName} onChange={(e) => setGateName(e.target.value)} placeholder="Main Gate" />
          </label>
          <button className="gateBtn" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="ymsError">{error}</div>}

      <div className="gateActions" style={{ justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'gateBtn gateBtnPrimary' : 'gateBtn'}
            onClick={() => {
              setTab(t.id);
              if (t.id === 'config') void refreshConfig();
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' ? (
        <div className="gateGrid">
          <DashboardCard title="Gate Status" description="Live indicators across all gates (auto-refresh 4s).">
            <GateStatusIndicator status={dashboard?.gateStatus ?? null} />
          </DashboardCard>

          <DashboardCard title="Today" description="Operational stats and security posture.">
            <div className="gateFeed">
              <div className="gateFeedItem">
                <div>
                  <div className="gateFeedTitle">Vehicles Checked In</div>
                  <div className="gateFeedMeta">{dashboard?.todayStatistics.checkedIn ?? 0}</div>
                </div>
                <Badge value="CheckIn" />
              </div>
              <div className="gateFeedItem">
                <div>
                  <div className="gateFeedTitle">Vehicles Checked Out</div>
                  <div className="gateFeedMeta">{dashboard?.todayStatistics.checkedOut ?? 0}</div>
                </div>
                <Badge value="CheckOut" />
              </div>
              <div className="gateFeedItem">
                <div>
                  <div className="gateFeedTitle">Avg Wait</div>
                  <div className="gateFeedMeta">{dashboard?.todayStatistics.avgWaitMinutes ?? 0} minutes</div>
                </div>
                <Badge value="Queue" />
              </div>
              <div className="gateFeedItem">
                <div>
                  <div className="gateFeedTitle">Security Events</div>
                  <div className="gateFeedMeta">{dashboard?.todayStatistics.securityEvents ?? 0}</div>
                </div>
                <Badge value="Security" />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Queue Snapshot" description="Current waiting vehicles (top 12)." actions={<button className="gateBtn" onClick={() => setTab('queue')}>Open Queue</button>}>
            <div className="gateFeed">
              {queue.slice(0, 12).map((q) => (
                <div key={q.id} className="gateFeedItem">
                  <div>
                    <div className="gateFeedTitle">{q.vehicleNumber}</div>
                    <div className="gateFeedMeta">
                      {q.driverName} • {q.priority} • {q.status}
                    </div>
                  </div>
                  <Badge value={`${q.estimatedWaitTime}m`} />
                </div>
              ))}
              {queue.length === 0 ? <div className="gateMuted">Queue is empty.</div> : null}
            </div>
          </DashboardCard>

          <DashboardCard title="Live Activity Feed" description="Latest gate operations and admin actions." actions={<button className="gateBtn" onClick={() => setTab('audit')}>Open Timeline</button>}>
            <ActivityFeed items={activities.slice(0, 40)} />
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'check-in' ? (
        <div className="gateGrid">
          <DashboardCard title="Vehicle Check-In" description="Arrival → verification → authorization → queue assignment." actions={checkInResult ? <Badge value={checkInResult.authorized ? 'Authorized' : 'Rejected'} /> : null}>
            <div className="gateCardBody">
              <div className="gateFormGrid">
                <label className="gateField">
                  <div className="gateLabel">Vehicle Number</div>
                  <input className="gateInput" value={checkInForm.vehicleNumber} onChange={(e) => setCheckInForm({ ...checkInForm, vehicleNumber: e.target.value })} />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Trailer Number</div>
                  <input className="gateInput" value={checkInForm.trailerNumber} onChange={(e) => setCheckInForm({ ...checkInForm, trailerNumber: e.target.value })} />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Vehicle Type</div>
                  <input className="gateInput" value={checkInForm.vehicleType} onChange={(e) => setCheckInForm({ ...checkInForm, vehicleType: e.target.value })} />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Appointment ID (optional)</div>
                  <input
                    className="gateInput"
                    value={checkInForm.appointmentId ?? ''}
                    onChange={(e) => setCheckInForm({ ...checkInForm, appointmentId: safeString(e.target.value) || undefined })}
                  />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Driver Name</div>
                  <input className="gateInput" value={checkInForm.driver.name} onChange={(e) => setCheckInForm({ ...checkInForm, driver: { ...checkInForm.driver, name: e.target.value } })} />
                </label>

                <label className="gateField">
                  <div className="gateLabel">License Number</div>
                  <input
                    className="gateInput"
                    value={checkInForm.driver.licenseNumber}
                    onChange={(e) => setCheckInForm({ ...checkInForm, driver: { ...checkInForm.driver, licenseNumber: e.target.value } })}
                  />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Phone</div>
                  <input className="gateInput" value={checkInForm.driver.phone} onChange={(e) => setCheckInForm({ ...checkInForm, driver: { ...checkInForm.driver, phone: e.target.value } })} />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Carrier</div>
                  <input
                    className="gateInput"
                    value={checkInForm.driver.carrierName}
                    onChange={(e) => setCheckInForm({ ...checkInForm, driver: { ...checkInForm.driver, carrierName: e.target.value } })}
                  />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Purpose</div>
                  <select
                    className="gateSelect"
                    value={checkInForm.purpose}
                    onChange={(e) => setCheckInForm({ ...checkInForm, purpose: e.target.value as CheckInForm['purpose'] })}
                  >
                    <option value="Loading">Loading</option>
                    <option value="Unloading">Unloading</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label className="gateField">
                  <div className="gateLabel">Estimated Duration (minutes)</div>
                  <input
                    className="gateInput"
                    type="number"
                    value={checkInForm.estimatedDuration}
                    onChange={(e) => setCheckInForm({ ...checkInForm, estimatedDuration: Number(e.target.value) })}
                  />
                </label>

                <label className="gateField" style={{ flexDirection: 'row', gap: '0.6rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={checkInForm.hazardousMaterials}
                    onChange={(e) => setCheckInForm({ ...checkInForm, hazardousMaterials: e.target.checked })}
                  />
                  <div className="gateLabel" style={{ margin: 0 }}>
                    Hazardous materials
                  </div>
                </label>

                <label className="gateField" style={{ flexDirection: 'row', gap: '0.6rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={checkInForm.temperatureControlled}
                    onChange={(e) => setCheckInForm({ ...checkInForm, temperatureControlled: e.target.checked })}
                  />
                  <div className="gateLabel" style={{ margin: 0 }}>
                    Temperature controlled
                  </div>
                </label>

                <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                  <div className="gateLabel">Notes</div>
                  <input className="gateInput" value={checkInForm.notes} onChange={(e) => setCheckInForm({ ...checkInForm, notes: e.target.value })} />
                </label>
              </div>

              <div className="gateActions">
                <button className="gateBtn" onClick={() => setCheckInResult(null)} disabled={busy}>
                  Clear Result
                </button>
                <button
                  className="gateBtn gateBtnPrimary"
                  onClick={doCheckIn}
                  disabled={busy || !checkInForm.vehicleNumber.trim() || !checkInForm.driver.name.trim() || !checkInForm.driver.licenseNumber.trim()}
                >
                  {busy ? 'Processing…' : 'Check In'}
                </button>
              </div>

              {checkInResult ? (
                <div className="gateFeed">
                  <div className="gateFeedItem">
                    <div>
                      <div className="gateFeedTitle">Check-In Result</div>
                      <div className="gateFeedMeta">
                        {checkInResult.authorized ? 'Authorized' : 'Rejected'}
                        {checkInResult.authorizationCode ? ` • Code: ${checkInResult.authorizationCode}` : ''}
                      </div>
                      {checkInResult.rejectionReason ? <div className="gateFeedMeta">Reason: {checkInResult.rejectionReason}</div> : null}
                      {checkInResult.queuePosition != null ? <div className="gateFeedMeta">Queue Position: {checkInResult.queuePosition}</div> : null}
                      {checkInResult.estimatedWaitTime != null ? <div className="gateFeedMeta">Est Wait: {checkInResult.estimatedWaitTime}m</div> : null}
                      {checkInResult.assignedGate ? <div className="gateFeedMeta">Assigned Gate: {checkInResult.assignedGate}</div> : null}
                    </div>
                    <Badge value={checkInResult.authorized ? 'Approved' : 'Denied'} />
                  </div>
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard title="Admin Quick Actions" description="Authorization overrides and queue shortcuts." actions={isAdmin ? <Badge value="Admin" /> : <Badge value="Limited" />}>
            <div className="gateCardBody">
              <div className="gateMuted">You can grant manual entry/exit authorization when policy checks fail.</div>
              <div className="gateActions" style={{ justifyContent: 'flex-start' }}>
                <button className="gateBtn" disabled={busy} onClick={() => openAuthFor(checkInForm.vehicleNumber.trim(), 'Entry')}>
                  Authorize Entry
                </button>
                <button className="gateBtn" disabled={busy} onClick={() => setTab('queue')}>
                  Manage Queue
                </button>
                <button className="gateBtn" disabled={busy || !canSecurityEvent} onClick={() => setSecurityModalOpen(true)}>
                  Report Security Event
                </button>
              </div>
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'check-out' ? (
        <div className="gateGrid">
          <DashboardCard title="Vehicle Check-Out" description="Operations complete → document check → security clearance → exit authorization.">
            <div className="gateCardBody">
              <div className="gateFormGrid">
                <label className="gateField">
                  <div className="gateLabel">Vehicle Number</div>
                  <input className="gateInput" value={checkOutVehicleNumber} onChange={(e) => setCheckOutVehicleNumber(e.target.value)} placeholder="TRK-123" />
                </label>
                <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                  <div className="gateLabel">Notes (optional)</div>
                  <input className="gateInput" value={checkOutNotes} onChange={(e) => setCheckOutNotes(e.target.value)} />
                </label>
              </div>
              <div className="gateActions">
                <button className="gateBtn" onClick={() => openAuthFor(checkOutVehicleNumber.trim(), 'Exit')} disabled={busy || !checkOutVehicleNumber.trim()}>
                  Authorize Exit
                </button>
                <button className="gateBtn gateBtnPrimary" onClick={doCheckOut} disabled={busy || !checkOutVehicleNumber.trim()}>
                  {busy ? 'Processing…' : 'Check Out'}
                </button>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Queue / Departures" description="Select from queue to prefill check-out.">
            <div className="gateFeed">
              {queue.length === 0 ? <div className="gateMuted">No vehicles in queue.</div> : null}
              {queue.slice(0, 24).map((q) => (
                <div key={q.id} className="gateFeedItem">
                  <div>
                    <div className="gateFeedTitle">{q.vehicleNumber}</div>
                    <div className="gateFeedMeta">{q.driverName} • {q.status}</div>
                  </div>
                  <button className="gateBtn" onClick={() => setCheckOutVehicleNumber(q.vehicleNumber)} disabled={busy}>
                    Select
                  </button>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'authorization' ? (
        <div className="gateGrid">
          <DashboardCard title="Authorization & Overrides" description="Approve/deny entry/exit with optional admin override and conditions." actions={<button className="gateBtn" onClick={() => openAuthFor('', 'Entry')}>New</button>}>
            <div className="gateCardBody">
              <div className="gateMuted">
                For full override capabilities you must be Admin. Non-admin roles may still request authorization where supported.
              </div>

              <div className="gateFormGrid">
                <label className="gateField">
                  <div className="gateLabel">Vehicle Number</div>
                  <input
                    className="gateInput"
                    value={authRequest.vehicleNumber}
                    onChange={(e) => setAuthRequest({ ...authRequest, vehicleNumber: e.target.value })}
                  />
                </label>

                <label className="gateField">
                  <div className="gateLabel">Action</div>
                  <select className="gateSelect" value={authRequest.action} onChange={(e) => setAuthRequest({ ...authRequest, action: e.target.value as 'Entry' | 'Exit' })}>
                    <option value="Entry">Entry</option>
                    <option value="Exit">Exit</option>
                  </select>
                </label>

                <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                  <div className="gateLabel">Reason</div>
                  <input className="gateInput" value={authRequest.reason} onChange={(e) => setAuthRequest({ ...authRequest, reason: e.target.value })} />
                </label>

                <label className="gateField" style={{ flexDirection: 'row', gap: '0.6rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={authRequest.overrideRestrictions}
                    onChange={(e) => setAuthRequest({ ...authRequest, overrideRestrictions: e.target.checked })}
                    disabled={!isAdmin}
                  />
                  <div className="gateLabel" style={{ margin: 0 }}>
                    Override restrictions (Admin)
                  </div>
                </label>

                {authRequest.overrideRestrictions ? (
                  <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                    <div className="gateLabel">Override Reason</div>
                    <input className="gateInput" value={authRequest.overrideReason ?? ''} onChange={(e) => setAuthRequest({ ...authRequest, overrideReason: e.target.value })} />
                  </label>
                ) : null}

                <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                  <div className="gateLabel">Conditions (comma-separated)</div>
                  <input
                    className="gateInput"
                    value={(authRequest.conditions ?? []).join(', ')}
                    onChange={(e) =>
                      setAuthRequest({
                        ...authRequest,
                        conditions: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>

                <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                  <div className="gateLabel">Expires At (optional ISO)</div>
                  <input className="gateInput" value={authRequest.expiresAt ?? ''} onChange={(e) => setAuthRequest({ ...authRequest, expiresAt: e.target.value })} />
                </label>
              </div>

              <div className="gateActions">
                <button className="gateBtn" onClick={() => setAuthDecision(null)} disabled={busy}>
                  Clear Decision
                </button>
                <button className="gateBtn gateBtnPrimary" onClick={submitAuth} disabled={busy || !authRequest.vehicleNumber.trim() || !authRequest.reason.trim()}>
                  {busy ? 'Submitting…' : 'Submit Authorization'}
                </button>
              </div>

              {authDecision ? (
                <div className="gateFeed">
                  <div className="gateFeedItem">
                    <div>
                      <div className="gateFeedTitle">Decision</div>
                      <div className="gateFeedMeta">
                        {authDecision.approved ? 'Approved' : 'Denied'} • Code: {authDecision.authorizationCode}
                      </div>
                      <div className="gateFeedMeta">Valid until: {authDecision.validUntil}</div>
                      <div className="gateFeedMeta">Approved by: {authDecision.approvedBy}</div>
                      <div className="gateFeedMeta">Conditions: {authDecision.conditions.join(', ') || '—'}</div>
                      <div className="gateFeedMeta">Notes: {authDecision.notes || '—'}</div>
                    </div>
                    <Badge value={authDecision.approved ? 'Approved' : 'Denied'} />
                  </div>
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard title="Quick Authorization" description="Start an authorization workflow for a queued vehicle.">
            <div className="gateFeed">
              {queue.length === 0 ? <div className="gateMuted">Queue is empty.</div> : null}
              {queue.slice(0, 24).map((q) => (
                <div key={q.id} className="gateFeedItem">
                  <div>
                    <div className="gateFeedTitle">{q.vehicleNumber}</div>
                    <div className="gateFeedMeta">
                      {q.driverName} • {q.priority} • {q.status}
                    </div>
                  </div>
                  <div className="gateActions">
                    <button className="gateBtn" onClick={() => openAuthFor(q.vehicleNumber, 'Entry')} disabled={busy}>
                      Entry
                    </button>
                    <button className="gateBtn" onClick={() => openAuthFor(q.vehicleNumber, 'Exit')} disabled={busy}>
                      Exit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'security' ? (
        <div className="gateGrid">
          <DashboardCard
            title="Security Event Management"
            description="Create, investigate, resolve, and audit security events."
            actions={
              <button className="gateBtn gateBtnPrimary" onClick={() => setSecurityModalOpen(true)} disabled={busy}>
                New Event
              </button>
            }
          >
            <div className="gateFeed">
              {events.length === 0 ? <div className="gateMuted">No security events.</div> : null}
              {events.map((e) => (
                <div key={e.id} className="gateFeedItem">
                  <div>
                    <div className="gateFeedTitle">
                      {e.type} • {e.severity} • {e.status}
                    </div>
                    <div className="gateFeedMeta">
                      {e.vehicleNumber ? `Vehicle: ${e.vehicleNumber} • ` : ''}
                      {e.driverName ? `Driver: ${e.driverName} • ` : ''}
                      {e.location} • {formatWhen(e.timestamp)}
                    </div>
                    <div className="gateFeedMeta">{e.description}</div>
                    {e.resolution ? <div className="gateFeedMeta">Resolution: {e.resolution}</div> : null}
                  </div>
                  <div className="gateActions">
                    <select className="gateSelect" value={e.status} onChange={(ev) => updateSecurityStatus(e.id, ev.target.value as SecurityEvent['status'])} disabled={busy}>
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    {isAdmin ? (
                      <button className="gateBtn gateBtnDanger" onClick={() => deleteSecurityEvent(e.id)} disabled={busy}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Security Notifications" description="Critical events should trigger immediate response protocols.">
            <div className="gateFeed">
              {events
                .filter((e) => e.severity === 'Critical' && (e.status === 'Open' || e.status === 'Investigating'))
                .slice(0, 12)
                .map((e) => (
                  <div key={e.id} className="gateFeedItem">
                    <div>
                      <div className="gateFeedTitle">Critical • {e.type}</div>
                      <div className="gateFeedMeta">{e.location} • {formatWhen(e.timestamp)}</div>
                      <div className="gateFeedMeta">{e.description}</div>
                    </div>
                    <Badge value="Critical" />
                  </div>
                ))}
              {events.filter((e) => e.severity === 'Critical' && (e.status === 'Open' || e.status === 'Investigating')).length === 0 ? (
                <div className="gateMuted">No critical open events.</div>
              ) : null}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'queue' ? (
        <div className="gateGrid">
          <DashboardCard
            title="Gate Queue Manager"
            description="Reorder, prioritize, remove, and bulk process vehicles."
            actions={
              <div className="gateActions">
                <button className="gateBtn" onClick={doReorder} disabled={busy || queue.length === 0}>
                  Save Current Order
                </button>
                <button className="gateBtn" onClick={() => setSelectedQueueIds({})} disabled={busy}>
                  Clear Selection
                </button>
              </div>
            }
          >
            <div className="gateCardBody">
              <div className="gateActions" style={{ justifyContent: 'flex-start' }}>
                <button className="gateBtn" disabled={bulkDisabled} onClick={() => void doBulk('Authorize')}>
                  Bulk Authorize
                </button>
                <button className="gateBtn" disabled={bulkDisabled} onClick={() => void doBulk('Reject')}>
                  Bulk Reject
                </button>
                <button className="gateBtn" disabled={bulkDisabled} onClick={() => void doBulk('Hold')}>
                  Bulk Hold
                </button>
                <button className="gateBtn" disabled={bulkDisabled} onClick={() => void doBulk('Redirect')}>
                  Bulk Redirect
                </button>
              </div>

              <div className="gateFeed">
                {queue.length === 0 ? <div className="gateMuted">Queue is empty.</div> : null}
                {queue.map((q) => (
                  <QueueItemRow
                    key={q.id}
                    item={q}
                    selected={Boolean(selectedQueueIds[q.id])}
                    onToggle={() => setSelectedQueueIds((p) => ({ ...p, [q.id]: !p[q.id] }))}
                    onPrioritize={(p) => void doPrioritize(q.id, p)}
                    onRemove={(reason) => void doRemoveFromQueue(q.id, reason)}
                  />
                ))}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Wait Time Estimates" description="Quick view (backend estimates if available)." actions={<button className="gateBtn" onClick={refresh}>Recompute</button>}>
            <div className="gateFeed">
              {queue.slice(0, 24).map((q) => (
                <div key={q.id} className="gateFeedItem">
                  <div>
                    <div className="gateFeedTitle">{q.vehicleNumber}</div>
                    <div className="gateFeedMeta">Priority: {q.priority} • Status: {q.status}</div>
                  </div>
                  <Badge value={`${q.estimatedWaitTime}m`} />
                </div>
              ))}
              {queue.length === 0 ? <div className="gateMuted">No estimates available.</div> : null}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'config' ? (
        <div className="gateGrid">
          <DashboardCard title="Gate Configuration" description="Operational settings, capacity, security level. Admin only." actions={<button className="gateBtn" onClick={refreshConfig} disabled={configLoading}>Refresh</button>}>
            <div className="gateFeed">
              {configLoading ? <div className="gateMuted">Loading…</div> : null}
              {!configLoading && (!config || config.length === 0) ? <div className="gateMuted">No configuration found.</div> : null}
              {(config ?? []).map((g) => (
                <div key={g.gateId} className="gateFeedItem">
                  <div>
                    <div className="gateFeedTitle">{g.gateName}</div>
                    <div className="gateFeedMeta">
                      Status: {g.status} • Capacity: {g.capacity} • Security: {g.securityLevel}
                    </div>
                    <div className="gateFeedMeta">
                      Hours: {g.operatingHours.open}–{g.operatingHours.close} ({g.operatingHours.timezone})
                    </div>
                    <div className="gateFeedMeta">Vehicles: {g.supportedVehicleTypes.join(', ') || '—'}</div>
                    <div className="gateFeedMeta">Instructions: {g.specialInstructions || '—'}</div>
                  </div>
                  <div className="gateActions">
                    <button
                      className="gateBtn"
                      disabled={busy}
                      onClick={() => {
                        const status = (window.prompt('New status: Active / Inactive / Maintenance', g.status) ?? '').trim() as GateConfig['status'];
                        if (!status) return;
                        void saveConfig(g.gateId, { status });
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Operational Notes" description="Changes are effective immediately and will be audited.">
            <div className="gateCardBody">
              <div className="gateMuted">
                This UI assumes backend implements `/api/gate/config` endpoints. If not yet implemented, you’ll see errors until backend catches up.
              </div>
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'audit' ? (
        <div className="gateGrid">
          <DashboardCard title="Activity Timeline" description="Merged activity feed with operational details.">
            <ActivityTimeline items={activities} />
          </DashboardCard>

          <DashboardCard title="Audit Trail (raw)" description="Backend audit events (if enabled)." actions={<button className="gateBtn" onClick={refresh} disabled={loading}>Refresh</button>}>
            <div className="gateFeed">
              {canAuditView ? (
                <>
                  {dashboard?.recentActivities.length ? null : <div className="gateMuted">No audit data.</div>}
                </>
              ) : (
                <div className="gateMuted">You don’t have `gate.audit_view` permission.</div>
              )}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {tab === 'emergency' ? (
        <div className="gateGrid">
          <DashboardCard title="Emergency Controls" description="Lockdown, suspend operations, or broadcast alerts. Admin only.">
            <EmergencyControlsPanel
              disabled={!isAdmin || busy}
              onLockdown={() => void doEmergency('lockdown_all_gates')}
              onEvacuate={() => void doEmergency('evacuate_yard')}
              onSuspend={() => void doEmergency('suspend_operations')}
              onBroadcast={(message) => void doEmergency('broadcast_alert', message)}
            />
          </DashboardCard>

          <DashboardCard title="Emergency Status" description="Monitor critical open security events.">
            <div className="gateFeed">
              {events
                .filter((e) => e.severity === 'Critical' && (e.status === 'Open' || e.status === 'Investigating'))
                .slice(0, 20)
                .map((e) => (
                  <div key={e.id} className="gateFeedItem">
                    <div>
                      <div className="gateFeedTitle">{e.type}</div>
                      <div className="gateFeedMeta">
                        {e.location} • {formatWhen(e.timestamp)}
                      </div>
                      <div className="gateFeedMeta">{e.description}</div>
                    </div>
                    <Badge value={e.status} />
                  </div>
                ))}
              {events.filter((e) => e.severity === 'Critical' && (e.status === 'Open' || e.status === 'Investigating')).length === 0 ? (
                <div className="gateMuted">No critical events currently open.</div>
              ) : null}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      <Modal title="Authorization" open={authModalOpen} onClose={() => setAuthModalOpen(false)}>
        <div className="gateCardBody">
          <div className="gateMuted">Create an entry/exit authorization decision with optional admin override.</div>

          <div className="gateFormGrid">
            <label className="gateField">
              <div className="gateLabel">Vehicle Number</div>
              <input className="gateInput" value={authRequest.vehicleNumber} onChange={(e) => setAuthRequest({ ...authRequest, vehicleNumber: e.target.value })} />
            </label>
            <label className="gateField">
              <div className="gateLabel">Action</div>
              <select className="gateSelect" value={authRequest.action} onChange={(e) => setAuthRequest({ ...authRequest, action: e.target.value as 'Entry' | 'Exit' })}>
                <option value="Entry">Entry</option>
                <option value="Exit">Exit</option>
              </select>
            </label>

            <label className="gateField" style={{ gridColumn: '1 / -1' }}>
              <div className="gateLabel">Reason</div>
              <input className="gateInput" value={authRequest.reason} onChange={(e) => setAuthRequest({ ...authRequest, reason: e.target.value })} />
            </label>

            <label className="gateField" style={{ flexDirection: 'row', gap: '0.6rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={authRequest.overrideRestrictions}
                onChange={(e) => setAuthRequest({ ...authRequest, overrideRestrictions: e.target.checked })}
                disabled={!isAdmin}
              />
              <div className="gateLabel" style={{ margin: 0 }}>
                Override restrictions (Admin)
              </div>
            </label>

            {authRequest.overrideRestrictions ? (
              <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                <div className="gateLabel">Override Reason</div>
                <input className="gateInput" value={authRequest.overrideReason ?? ''} onChange={(e) => setAuthRequest({ ...authRequest, overrideReason: e.target.value })} />
              </label>
            ) : null}

            <label className="gateField" style={{ gridColumn: '1 / -1' }}>
              <div className="gateLabel">Conditions (comma-separated)</div>
              <input
                className="gateInput"
                value={(authRequest.conditions ?? []).join(', ')}
                onChange={(e) =>
                  setAuthRequest({
                    ...authRequest,
                    conditions: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>

            <label className="gateField" style={{ gridColumn: '1 / -1' }}>
              <div className="gateLabel">Expires At (optional)</div>
              <input className="gateInput" value={authRequest.expiresAt ?? ''} onChange={(e) => setAuthRequest({ ...authRequest, expiresAt: e.target.value })} />
            </label>
          </div>

          <div className="gateActions">
            <button className="gateBtn gateBtnPrimary" onClick={submitAuth} disabled={busy || !authRequest.vehicleNumber.trim() || !authRequest.reason.trim()}>
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </div>

          {authDecision ? (
            <div className="gateFeed">
              <div className="gateFeedItem">
                <div>
                  <div className="gateFeedTitle">Decision</div>
                  <div className="gateFeedMeta">
                    {authDecision.approved ? 'Approved' : 'Denied'} • Code: {authDecision.authorizationCode}
                  </div>
                  <div className="gateFeedMeta">Valid until: {authDecision.validUntil}</div>
                  <div className="gateFeedMeta">Conditions: {authDecision.conditions.join(', ') || '—'}</div>
                </div>
                <Badge value={authDecision.approved ? 'Approved' : 'Denied'} />
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal title="New Security Event" open={securityModalOpen} onClose={() => setSecurityModalOpen(false)}>
        <div className="gateCardBody">
          <SecurityEventFormPanel value={securityDraft} onChange={setSecurityDraft} />
          <div className="gateActions">
            <button className="gateBtn" onClick={() => setSecurityModalOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button
              className="gateBtn gateBtnPrimary"
              onClick={submitSecurityEvent}
              disabled={busy || !securityDraft.location.trim() || !securityDraft.description.trim() || !securityDraft.immediateAction.trim()}
            >
              {busy ? 'Submitting…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
