import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { hasGatePermission } from '../../auth/permissions';
import { Badge } from '../Dashboard/components/Badge';
import { DashboardCard } from '../Dashboard/components/DashboardCard';
import * as gateApi from '../../api/gate';

import './GateOperationsPage.css';

type GateMode = 'check-in' | 'check-out' | 'move-to-dock' | 'security-event';

function formatWhen(utc: string) {
  try {
    return new Date(utc).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' });
  } catch {
    return utc;
  }
}

export function GateOperationsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const canView = hasGatePermission(role, 'gate.view');
  const canCheckIn = hasGatePermission(role, 'gate.check_in');
  const canCheckOut = hasGatePermission(role, 'gate.check_out');
  const canMoveToDock = hasGatePermission(role, 'gate.move_to_dock');
  const canSecurity = hasGatePermission(role, 'gate.security_event');
  const canAudit = hasGatePermission(role, 'gate.audit_view');

  const availableModes = useMemo<GateMode[]>(() => {
    const m: GateMode[] = [];
    if (canCheckIn) m.push('check-in');
    if (canCheckOut) m.push('check-out');
    if (canMoveToDock) m.push('move-to-dock');
    if (canSecurity) m.push('security-event');
    return m;
  }, [canCheckIn, canCheckOut, canMoveToDock, canSecurity]);

  const [mode, setMode] = useState<GateMode>(() => availableModes[0] ?? 'check-in');

  const [gateName, setGateName] = useState('Main Gate');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [dockOrParking, setDockOrParking] = useState('');

  const [eventType, setEventType] = useState('SealMissing');
  const [severity, setSeverity] = useState('Warning');
  const [note, setNote] = useState('');

  const [activities, setActivities] = useState<gateApi.GateActivityDto[]>([]);
  const [audit, setAudit] = useState<gateApi.GateAuditEventDto[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!availableModes.includes(mode)) {
      setMode(availableModes[0] ?? 'check-in');
    }
  }, [availableModes, mode]);

  async function refreshFeed() {
    if (!canView) return;
    setLoadingFeed(true);
    setError(null);
    try {
      const items = await gateApi.getGateActivities(150);
      setActivities(items);

      if (canAudit) {
        const a = await gateApi.getGateAudit(200);
        setAudit(a);
      } else {
        setAudit([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load gate activity');
    } finally {
      setLoadingFeed(false);
    }
  }

  useEffect(() => {
    void refreshFeed();

    if (!canView) return;

    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      void refreshFeed();
    }, 5000);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, canAudit]);

  function resetInputs() {
    setVehicleNumber('');
    setDriverName('');
    setTrailerNumber('');
    setSealNumber('');
    setDockOrParking('');
    setNote('');
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'check-in') {
        await gateApi.gateCheckIn({
          gateName,
          vehicleNumber,
          driverName: driverName || null,
          trailerNumber: trailerNumber || null,
          sealNumber: sealNumber || null,
          dockOrParking: dockOrParking || null,
        });
      }

      if (mode === 'check-out') {
        await gateApi.gateCheckOut({
          gateName,
          vehicleNumber,
          driverName: driverName || null,
          trailerNumber: trailerNumber || null,
          sealNumber: sealNumber || null,
          dockOrParking: dockOrParking || null,
        });
      }

      if (mode === 'move-to-dock') {
        await gateApi.gateMoveToDock({
          gateName,
          vehicleNumber,
          dockOrParking,
        });
      }

      if (mode === 'security-event') {
        await gateApi.gateSecurityEvent({
          gateName,
          vehicleNumber,
          driverName: driverName || null,
          eventType,
          severity,
          note: note || null,
          trailerNumber: trailerNumber || null,
          sealNumber: sealNumber || null,
        });
      }

      resetInputs();
      await refreshFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = useMemo(() => {
    if (!gateName.trim()) return false;
    if (!vehicleNumber.trim()) return false;

    if (mode === 'move-to-dock') return Boolean(dockOrParking.trim());

    if (mode === 'security-event') {
      return Boolean(eventType.trim()) && Boolean(severity.trim());
    }

    return true;
  }, [dockOrParking, eventType, gateName, mode, severity, vehicleNumber]);

  const modeTitle: Record<GateMode, string> = {
    'check-in': 'Gate Check-In',
    'check-out': 'Gate Check-Out',
    'move-to-dock': 'Dock / Parking Confirmation',
    'security-event': 'Security Event',
  };

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

  return (
    <div className="ymsPage">
      <div className="ymsPageHeader">
        <div>
          <div className="ymsPageTitle">Gate Operations</div>
          <div className="ymsPageSub">Fast entry/exit handling with verification, exceptions, and a full audit trail.</div>
        </div>
        <div className="gateActions">
          <button className="gateBtn" onClick={refreshFeed} disabled={loadingFeed}>
            {loadingFeed ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="ymsError">{error}</div>}

      <div className="gateGrid">
        <DashboardCard
          title={modeTitle[mode]}
          description={`Signed in as ${user?.username ?? 'User'} (${role || 'Unknown role'})`}
          actions={
            availableModes.length > 1 ? (
              <select className="gateSelect" value={mode} onChange={(e) => setMode(e.target.value as GateMode)}>
                {availableModes.map((m) => (
                  <option key={m} value={m}>
                    {modeTitle[m]}
                  </option>
                ))}
              </select>
            ) : null
          }
        >
          <div className="gateCardBody">
            <div className="gateFormGrid">
              <label className="gateField">
                <div className="gateLabel">Gate</div>
                <input className="gateInput" value={gateName} onChange={(e) => setGateName(e.target.value)} placeholder="Main Gate" />
              </label>

              <label className="gateField">
                <div className="gateLabel">Vehicle Number</div>
                <input className="gateInput" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="TRK-123" />
              </label>

              {mode !== 'move-to-dock' ? (
                <label className="gateField">
                  <div className="gateLabel">Driver Name</div>
                  <input className="gateInput" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="John Smith" />
                </label>
              ) : null}

              {mode !== 'move-to-dock' ? (
                <label className="gateField">
                  <div className="gateLabel">Trailer Number</div>
                  <input className="gateInput" value={trailerNumber} onChange={(e) => setTrailerNumber(e.target.value)} placeholder="TRL-900" />
                </label>
              ) : null}

              {mode !== 'move-to-dock' ? (
                <label className="gateField">
                  <div className="gateLabel">Seal Number</div>
                  <input className="gateInput" value={sealNumber} onChange={(e) => setSealNumber(e.target.value)} placeholder="SEAL-001" />
                </label>
              ) : null}

              {mode === 'move-to-dock' ? (
                <label className="gateField">
                  <div className="gateLabel">Dock / Parking</div>
                  <input className="gateInput" value={dockOrParking} onChange={(e) => setDockOrParking(e.target.value)} placeholder="Dock 4 / Lot B-12" />
                </label>
              ) : (
                <label className="gateField">
                  <div className="gateLabel">Dock / Parking (optional)</div>
                  <input className="gateInput" value={dockOrParking} onChange={(e) => setDockOrParking(e.target.value)} placeholder="Dock 4 / Lot B-12" />
                </label>
              )}

              {mode === 'security-event' ? (
                <>
                  <label className="gateField">
                    <div className="gateLabel">Event Type</div>
                    <select className="gateSelect" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      <option value="SealMissing">Seal Missing</option>
                      <option value="SealMismatch">Seal Mismatch</option>
                      <option value="TrailerMismatch">Trailer Mismatch</option>
                      <option value="DriverVerificationFailed">Driver Verification Failed</option>
                      <option value="VehicleVerificationFailed">Vehicle Verification Failed</option>
                      <option value="DeniedEntry">Denied Entry</option>
                      <option value="DeniedExit">Denied Exit</option>
                    </select>
                  </label>

                  <label className="gateField">
                    <div className="gateLabel">Severity</div>
                    <select className="gateSelect" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                      <option value="Info">Info</option>
                      <option value="Warning">Warning</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </label>

                  <label className="gateField" style={{ gridColumn: '1 / -1' }}>
                    <div className="gateLabel">Note (optional)</div>
                    <input className="gateInput" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" />
                  </label>
                </>
              ) : null}
            </div>

            <div className="gateActions">
              <button className="gateBtn" onClick={resetInputs} disabled={busy}>
                Clear
              </button>
              <button className="gateBtn gateBtnPrimary" onClick={submit} disabled={!canSubmit || busy}>
                {busy ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Live Gate Activity" description="Auto-refreshes every 5 seconds.">
          <div className="gateFeed">
            {activities.length === 0 ? <div className="gateMuted">No gate activity yet.</div> : null}
            {activities.map((a) => (
              <div key={a.id} className="gateFeedItem">
                <div>
                  <div className="gateFeedTitle">
                    {a.vehicleNumber ?? 'Vehicle'} @ {a.gateName}
                  </div>
                  <div className="gateFeedMeta">
                    {a.driverName ? `Driver: ${a.driverName} • ` : ''}
                    {formatWhen(a.occurredAtUtc)}
                  </div>
                </div>
                <div>
                  <Badge value={a.type} />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {canAudit ? (
        <DashboardCard title="Audit Trail (Managers/Admin)" description="Every gate action is logged with actor, role, and timestamp.">
          <div className="gateFeed">
            {audit.length === 0 ? <div className="gateMuted">No audit events yet.</div> : null}
            {audit.map((e) => (
              <div key={e.id} className="gateFeedItem">
                <div>
                  <div className="gateFeedTitle">
                    {e.action} • {e.outcome}
                  </div>
                  <div className="gateFeedMeta">
                    Gate: {e.gateName} • Role: {e.actorRole} • {formatWhen(e.occurredAtUtc)}
                  </div>
                </div>
                <div>
                  <Badge value={e.outcome} />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
