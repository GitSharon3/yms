import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Badge } from '../Dashboard/components/Badge';
import { DashboardCard } from '../Dashboard/components/DashboardCard';
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment,
  type AppointmentDto,
  type AppointmentPriority,
} from '../../api/appointments';
import { getDocks, type DockDto } from '../../api/docks';
import { getVehicles, type VehicleDto } from '../../api/vehicles';
import { getYards, type Yard } from '../../api/yards';

import './AppointmentsPage.css';

type AppointmentStatus = 'Scheduled' | 'Rescheduled' | 'CheckedIn' | 'Completed' | 'Missed' | 'Cancelled';

type AppointmentLifecycleStep = {
  key: 'Scheduled' | 'Confirmed' | 'CheckedIn' | 'InYard' | 'Docked' | 'Completed';
  label: string;
};

const APPOINTMENT_LIFECYCLE: AppointmentLifecycleStep[] = [
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'CheckedIn', label: 'Checked In' },
  { key: 'InYard', label: 'In Yard' },
  { key: 'Docked', label: 'Docked' },
  { key: 'Completed', label: 'Completed' },
];

type Appointment = {
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
  priority: AppointmentPriority;
  notes?: string;
  history: Array<{ status: AppointmentStatus; atUtc: string; note?: string }>;
};

type ViewMode = 'calendar' | 'list';

type OverviewItem = {
  status: AppointmentStatus;
  label: string;
  color: string;
};

const OVERVIEW: OverviewItem[] = [
  { status: 'Scheduled', label: 'Scheduled', color: '#2563eb' },
  { status: 'Rescheduled', label: 'Rescheduled', color: '#7c3aed' },
  { status: 'CheckedIn', label: 'Checked In', color: '#f59e0b' },
  { status: 'Completed', label: 'Completed', color: '#22c55e' },
  { status: 'Missed', label: 'Missed', color: '#ef4444' },
  { status: 'Cancelled', label: 'Cancelled', color: '#94a3b8' },
];

function displayAppointmentId(a: { code?: string; id: string }) {
  return a.code?.trim() ? a.code : a.id;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

function startOfMonth(d: Date) {
  const c = new Date(d);
  c.setDate(1);
  return startOfDay(c);
}

function endOfMonth(d: Date) {
  const c = new Date(d);
  c.setMonth(c.getMonth() + 1);
  c.setDate(0);
  return startOfDay(c);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function countByStatus(items: Appointment[]) {
  const map: Partial<Record<AppointmentStatus, number>> = {};
  items.forEach((a) => {
    map[a.status] = (map[a.status] ?? 0) + 1;
  });
  return map;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTimeRange(startUtc: string, endUtc: string) {
  const start = new Date(startUtc);
  const end = new Date(endUtc);
  const time = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${time(start)} - ${time(end)}`;
}

function formatMonthTitle(d: Date) {
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function isoDate(d: Date) {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoTimeLocal(d: Date) {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function sortString(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function useAnimatedNumber(target: number, durationMs = 550) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = value;
    const delta = target - startValue;
    if (delta === 0) return;

    const start = performance.now();

    const tick = (now: number) => {
      const t = clamp((now - start) / durationMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(startValue + delta * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return value;
}

function OverviewCard({ item, count, active, onClick }: { item: OverviewItem; count: number; active: boolean; onClick: () => void }) {
  const animated = useAnimatedNumber(count);

  return (
    <button type="button" className={active ? 'apptKpiCard active' : 'apptKpiCard'} onClick={onClick}>
      <div className="apptKpiIcon" style={{ color: item.color, background: `${item.color}1A` }} aria-hidden>
        {item.label.slice(0, 1)}
      </div>
      <div className="apptKpiLabel">{item.label}</div>
      <div className="apptKpiValue" style={{ color: item.color }}>
        {animated}
      </div>
    </button>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="apptModalOverlay" role="dialog" aria-modal="true">
      <div className="apptModal">
        <div className="apptModalHeader">
          <div className="apptModalTitle">{title}</div>
          <button className="apptModalClose" onClick={onClose} aria-label="Close" type="button">
            ✕
          </button>
        </div>
        <div className="apptModalBody">{children}</div>
      </div>
    </div>
  );
}

type AppointmentDraft = {
  yardId: string;
  dockId: string;
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  notes: string;
  reason: string;
};

function ActionButton({
  children,
  variant,
  onClick,
  disabled,
  title,
}: {
  children: string;
  variant: 'neutral' | 'danger';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const cls = variant === 'danger' ? 'apptBtn danger' : 'apptBtn';
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

function lifecycleIndexForStatus(status: AppointmentStatus) {
  if (status === 'Scheduled') return 0;
  if (status === 'CheckedIn') return 2;
  if (status === 'Completed') return 5;
  return -1;
}

export function AppointmentsPage() {
  const [view, setView] = useState<ViewMode>('calendar');
  const [query, setQuery] = useState('');
  const [yardFilter, setYardFilter] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [activeStatus, setActiveStatus] = useState<AppointmentStatus | 'All'>('All');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [yards, setYards] = useState<Yard[]>([]);
  const [docksByYard, setDocksByYard] = useState<Record<string, DockDto[]>>({});
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);

  const [modal, setModal] = useState<'none' | 'create' | 'edit' | 'reschedule' | 'cancel'>('none');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);

  const dockOptionsForDraft = useMemo(() => {
    if (!draft?.yardId) return [];
    return docksByYard[draft.yardId] ?? [];
  }, [docksByYard, draft?.yardId]);

  type VehicleOption = { id: string; vehicleNumber: string; driverName: string | null };
  const vehicleOptions = useMemo<VehicleOption[]>(() => {
    return vehicles.map((v) => ({ id: v.id, vehicleNumber: v.vehicleNumber, driverName: v.driverName ?? null }));
  }, [vehicles]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const ensureDocksLoaded = useCallback(
    async (yardId: string) => {
      if (!yardId || yardId === 'All') return;
      if (docksByYard[yardId]) return;
      try {
        const items = await getDocks({ yardId, take: 250 });
        setDocksByYard((prev) => ({ ...prev, [yardId]: items }));
      } catch {
        setDocksByYard((prev) => ({ ...prev, [yardId]: [] }));
      }
    },
    [docksByYard],
  );

  const refreshAppointments = useCallback(async () => {
    const items = await getAppointments({ take: 500 });
    const mapped: Appointment[] = (items ?? []).map((a: AppointmentDto) => ({
      id: a.id,
      code: a.code,
      yardId: a.yardId,
      dockId: a.dockId,
      vehicleId: a.vehicleId,
      status: a.status,
      scheduledStartUtc: a.scheduledStartUtc,
      scheduledEndUtc: a.scheduledEndUtc,
      truckId: a.truckId,
      driver: a.driver,
      dock: a.dock,
      location: a.location,
      type: a.type,
      priority: 'Normal',
      notes: a.notes,
      history: a.history ?? [],
    }));
    setAppointments(mapped);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void refreshAppointments()
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load appointments');
        setAppointments([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [refreshAppointments]);

  useEffect(() => {
    let mounted = true;

    void getYards()
      .then((items) => {
        if (!mounted) return;
        setYards(items ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setYards([]);
      });

    void getVehicles({ take: 500 })
      .then((items) => {
        if (!mounted) return;
        setVehicles(items ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setVehicles([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    const map: Record<AppointmentStatus, number> = {
      Scheduled: 0,
      Rescheduled: 0,
      CheckedIn: 0,
      Completed: 0,
      Missed: 0,
      Cancelled: 0,
    };

    appointments.forEach((a) => {
      map[a.status] += 1;
    });

    return map;
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      if (activeStatus !== 'All' && a.status !== activeStatus) return false;
      if (yardFilter !== 'All' && a.yardId !== yardFilter) return false;
      if (q) {
        const hay = `${displayAppointmentId(a)} ${a.truckId} ${a.driver} ${a.type} ${a.location} ${a.dock}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, activeStatus, query, yardFilter]);

  const yardOptions = useMemo(() => {
    const allowed = new Set(['North Yard', 'East Yard', 'West Yard', 'South Yard']);
    const filteredYards = yards.filter((y) => allowed.has(y.name));
    return [{ id: 'All', name: 'Filter by Yard' }, ...filteredYards.map((y) => ({ id: y.id, name: y.name }))];
  }, [yards]);

  const dockOptionsForFilter = useMemo(() => {
    if (yardFilter === 'All') return [];
    return docksByYard[yardFilter] ?? [];
  }, [docksByYard, yardFilter]);

  const [dockFilter, setDockFilter] = useState<string>('All');

  useEffect(() => {
    if (yardFilter !== 'All') void ensureDocksLoaded(yardFilter);
    setDockFilter('All');
  }, [ensureDocksLoaded, yardFilter]);

  const filteredWithDock = useMemo(() => {
    if (dockFilter === 'All') return filtered;
    return filtered.filter((a) => a.dockId === dockFilter);
  }, [dockFilter, filtered]);

  useEffect(() => {
    if (!selectedId && filteredWithDock.length > 0) setSelectedId(filteredWithDock[0].id);
  }, [filteredWithDock, selectedId]);

  const selected = useMemo(
    () => filteredWithDock.find((a) => a.id === selectedId) ?? null,
    [filteredWithDock, selectedId],
  );

  const monthCursor = useMemo(() => startOfMonth(selectedDate), [selectedDate]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const startWeekday = start.getDay();
    const gridStart = addDays(start, -startWeekday);
    const total = 42;

    return Array.from({ length: total }).map((_, i) => {
      const date = addDays(gridStart, i);
      const inMonth = date.getMonth() === monthCursor.getMonth();
      const items = filteredWithDock.filter((a) => sameDay(new Date(a.scheduledStartUtc), date));
      return { date, inMonth, items };
    });
  }, [filteredWithDock, monthCursor]);

  type SortKey = 'date' | 'time' | 'status' | 'location';
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'asc' });

  const sortedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const list = filteredWithDock.slice();
    list.sort((a, b) => {
      if (sort.key === 'status') return dir * sortString(a.status, b.status);
      if (sort.key === 'location') return dir * sortString(a.location, b.location);
      if (sort.key === 'time') return dir * (new Date(a.scheduledStartUtc).getTime() - new Date(b.scheduledStartUtc).getTime());
      return dir * (new Date(a.scheduledStartUtc).getTime() - new Date(b.scheduledStartUtc).getTime());
    });
    return list;
  }, [filteredWithDock, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  function openCreate() {
    setModalError(null);
    setDraft({
      yardId: '',
      dockId: '',
      vehicleId: '',
      date: isoDate(selectedDate),
      startTime: '09:00',
      endTime: '10:00',
      type: 'Loading',
      priority: 'Normal',
      status: 'Scheduled',
      notes: '',
      reason: '',
    });
    setModal('create');
  }

  function openEdit(appt: Appointment) {
    const start = new Date(appt.scheduledStartUtc);
    const end = new Date(appt.scheduledEndUtc);
    setModalError(null);
    setDraft({
      yardId: appt.yardId,
      dockId: appt.dockId ?? '',
      vehicleId: appt.vehicleId ?? '',
      date: isoDate(start),
      startTime: isoTimeLocal(start),
      endTime: isoTimeLocal(end),
      type: appt.type,
      priority: appt.priority,
      status: appt.status,
      notes: appt.notes ?? '',
      reason: '',
    });
    void ensureDocksLoaded(appt.yardId);
    setModal('edit');
  }

  function openReschedule(appt: Appointment) {
    const start = new Date(appt.scheduledStartUtc);
    const end = new Date(appt.scheduledEndUtc);
    setModalError(null);
    setDraft({
      yardId: appt.yardId,
      dockId: appt.dockId ?? '',
      vehicleId: appt.vehicleId ?? '',
      date: isoDate(start),
      startTime: isoTimeLocal(start),
      endTime: isoTimeLocal(end),
      type: appt.type,
      priority: appt.priority,
      status: appt.status,
      notes: appt.notes ?? '',
      reason: '',
    });
    void ensureDocksLoaded(appt.yardId);
    setModal('reschedule');
  }

  function openCancel(appt: Appointment) {
    setModalError(null);
    setSelectedId(appt.id);
    setDraft({
      yardId: appt.yardId,
      dockId: appt.dockId ?? '',
      vehicleId: appt.vehicleId ?? '',
      date: isoDate(new Date(appt.scheduledStartUtc)),
      startTime: isoTimeLocal(new Date(appt.scheduledStartUtc)),
      endTime: isoTimeLocal(new Date(appt.scheduledEndUtc)),
      type: appt.type,
      priority: appt.priority,
      status: appt.status,
      notes: appt.notes ?? '',
      reason: '',
    });
    setModal('cancel');
  }

  function closeModal() {
    setModal('none');
    setModalBusy(false);
    setModalError(null);
    setDraft(null);
  }

  async function saveCreate() {
    if (!draft) return;
    setModalBusy(true);
    setModalError(null);

    try {
      if (!draft.yardId) throw new Error('Yard is required');
      if (!draft.date) throw new Error('Date is required');
      if (!draft.startTime || !draft.endTime) throw new Error('Time window is required');
      if (!draft.type.trim()) throw new Error('Appointment type is required');

      const start = combineLocalDateTime(draft.date, draft.startTime);
      const end = combineLocalDateTime(draft.date, draft.endTime);
      if (end.getTime() <= start.getTime()) throw new Error('End time must be after start time');

      const created = await createAppointment({
        yardId: draft.yardId,
        dockId: draft.dockId ? draft.dockId : null,
        vehicleId: draft.vehicleId ? draft.vehicleId : null,
        scheduledStartUtc: start.toISOString(),
        scheduledEndUtc: end.toISOString(),
        cargoType: draft.type.trim(),
        priority: draft.priority,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
      });

      await refreshAppointments();
      setSelectedId(created.id);
      closeModal();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to save appointment');
    } finally {
      setModalBusy(false);
    }
  }

  async function saveEdit() {
    if (!draft || !selectedId) return;
    setModalBusy(true);
    setModalError(null);

    try {
      if (!draft.date) throw new Error('Date is required');
      if (!draft.startTime || !draft.endTime) throw new Error('Time window is required');
      if (!draft.type.trim()) throw new Error('Appointment type is required');

      const start = combineLocalDateTime(draft.date, draft.startTime);
      const end = combineLocalDateTime(draft.date, draft.endTime);
      if (end.getTime() <= start.getTime()) throw new Error('End time must be after start time');

      await updateAppointment(selectedId, {
        dockId: draft.dockId ? draft.dockId : null,
        vehicleId: draft.vehicleId ? draft.vehicleId : null,
        scheduledStartUtc: start.toISOString(),
        scheduledEndUtc: end.toISOString(),
        cargoType: draft.type.trim(),
        priority: draft.priority,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
      });

      await refreshAppointments();
      closeModal();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to update appointment');
    } finally {
      setModalBusy(false);
    }
  }

  async function confirmCancel() {
    if (!selectedId || !draft) return;
    setModalBusy(true);
    setModalError(null);
    try {
      if (!draft.reason.trim()) throw new Error('Cancellation reason is required');
      await updateAppointment(selectedId, { status: 'Cancelled', actionNote: draft.reason.trim() });
      await refreshAppointments();
      closeModal();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to cancel appointment');
    } finally {
      setModalBusy(false);
    }
  }

  async function confirmDelete() {
    if (!selectedId) return;
    const ok = window.confirm('Delete this appointment? This cannot be undone.');
    if (!ok) return;

    setModalBusy(true);
    setModalError(null);
    try {
      await deleteAppointment(selectedId);
      await refreshAppointments();
      setSelectedId(null);
      closeModal();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to delete appointment');
    } finally {
      setModalBusy(false);
    }
  }

  const onSelectAppointment = (id: string) => {
    setSelectedId(id);
    setDetailsOpen(true);
  };

  const actionsDisabledReason = useMemo(() => {
    if (!selected) return null;
    if (selected.status === 'Completed') return 'Completed appointments cannot be modified.';
    if (selected.status === 'Cancelled') return 'Cancelled appointments cannot be modified.';
    return null;
  }, [selected]);

  return (
    <div className="ymsPage">
      <div className="ymsPageHeader">
        <div>
          <div className="ymsPageTitle">Appointments</div>
          <div className="ymsPageSub">Plan, track, and manage dock appointments across locations.</div>
          {loading ? <div className="ymsLoading">Loading…</div> : null}
          {error ? <div className="ymsError">{error}</div> : null}
        </div>

        <div className="apptHeaderActions">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="apptSearchInput"
          />
          <button type="button" className="apptPrimaryAction" onClick={openCreate}>
            + Add Appointment
          </button>
        </div>
      </div>

      <DashboardCard title="Appointments Overview" description="Snapshot of today’s appointment flow.">
        <div className="apptKpiGrid">
          {OVERVIEW.map((item) => (
            <OverviewCard
              key={item.status}
              item={item}
              count={counts[item.status]}
              active={activeStatus === item.status}
              onClick={() => setActiveStatus((prev) => (prev === item.status ? 'All' : item.status))}
            />
          ))}
        </div>
      </DashboardCard>

      <div className="apptLayout">
        <div className="apptMainPane">
          <DashboardCard
            title=""
            actions={
              <div className="apptToolbar">
                <div className="apptToolbarGroup" aria-label="View controls">
                  <div className="apptToggle" role="tablist" aria-label="Appointments view">
                    <button
                      type="button"
                      className={view === 'calendar' ? 'apptToggleBtn active' : 'apptToggleBtn'}
                      onClick={() => setView('calendar')}
                      role="tab"
                      aria-selected={view === 'calendar'}
                    >
                      Calendar
                    </button>
                    <button
                      type="button"
                      className={view === 'list' ? 'apptToggleBtn active' : 'apptToggleBtn'}
                      onClick={() => setView('list')}
                      role="tab"
                      aria-selected={view === 'list'}
                    >
                      List
                    </button>
                  </div>
                </div>

                <div className="apptToolbarGroup" aria-label="Filters">
                  <select value={yardFilter} onChange={(e) => setYardFilter(e.target.value)} className="apptSelect">
                    {yardOptions.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dockFilter}
                    onChange={(e) => setDockFilter(e.target.value)}
                    className="apptSelect"
                    disabled={yardFilter === 'All'}
                  >
                    <option value="All">Filter by Dock</option>
                    {dockOptionsForFilter.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    className="apptDate"
                    value={isoDate(selectedDate)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      setSelectedDate(startOfDay(new Date(`${v}T00:00:00`)));
                    }}
                  />
                </div>

                <div className="apptToolbarGroup" aria-label="Details panel">
                  <button type="button" className="apptIconBtn" onClick={() => setDetailsOpen((v) => !v)}>
                    {detailsOpen ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              </div>
            }
          >
            <div className={view === 'calendar' ? 'apptViewSwitch calendar' : 'apptViewSwitch list'}>
              <div className={view === 'calendar' ? 'apptView apptViewActive' : 'apptView apptViewInactive'}>
                <div className="apptCalendarHeader">
                  <button
                    type="button"
                    className="apptIconBtn"
                    onClick={() => setSelectedDate((d) => addDays(startOfMonth(d), -1))}
                    aria-label="Previous month"
                  >
                    ←
                  </button>
                  <div className="apptCalendarTitle">{formatMonthTitle(monthCursor)}</div>
                  <button
                    type="button"
                    className="apptIconBtn"
                    onClick={() => setSelectedDate((d) => addDays(endOfMonth(d), 1))}
                    aria-label="Next month"
                  >
                    →
                  </button>
                </div>

                <div className="apptCalendarGrid" role="grid" aria-label="Monthly calendar">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="apptCalendarDow" role="columnheader">
                      {d}
                    </div>
                  ))}
                  {calendarDays.map(({ date, inMonth, items }) => {
                    const isSelected = sameDay(date, selectedDate);
                    const isToday = sameDay(date, startOfDay(new Date()));
                    const hasByStatus = (s: AppointmentStatus) => items.some((a) => a.status === s);
                    const byStatus = countByStatus(items);
                    const tooltipParts = OVERVIEW.filter((o) => (byStatus[o.status] ?? 0) > 0).map(
                      (o) => `${o.label}: ${byStatus[o.status] ?? 0}`,
                    );
                    const title = items.length > 0 ? `${items.length} appointment(s)\n${tooltipParts.join('\n')}` : undefined;
                    return (
                      <button
                        type="button"
                        key={date.toISOString()}
                        className={
                          isSelected
                            ? 'apptCalendarDay selected'
                            : inMonth
                              ? 'apptCalendarDay'
                              : 'apptCalendarDay muted'
                        }
                        onClick={() => setSelectedDate(startOfDay(date))}
                        title={title}
                        role="gridcell"
                        aria-selected={isSelected}
                        data-today={isToday ? 'true' : 'false'}
                      >
                        <div className="apptCalendarDayTop">
                          <span className="apptCalendarDayNum">{date.getDate()}</span>
                          {items.length > 0 ? <span className="apptCalendarDayPill">{items.length}</span> : null}
                        </div>
                        {items.length > 0 ? (
                          <div className="apptCalendarDots" aria-hidden>
                            {OVERVIEW.map((o) => (
                              <span
                                key={o.status}
                                className={hasByStatus(o.status) ? 'apptCalendarDot on' : 'apptCalendarDot'}
                                style={{ background: o.color }}
                              />
                            ))}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="apptDayList">
                  <div className="apptDayListTitle">
                    Appointments on{' '}
                    {selectedDate.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                  </div>
                  {filteredWithDock.filter((a) => sameDay(new Date(a.scheduledStartUtc), selectedDate)).length === 0 ? (
                    <div className="emptyState">No appointments for this date.</div>
                  ) : (
                    <div className="apptList">
                      {filteredWithDock
                        .filter((a) => sameDay(new Date(a.scheduledStartUtc), selectedDate))
                        .map((a) => (
                          <button
                            type="button"
                            key={a.id}
                            className={a.id === selectedId ? 'apptListItem active' : 'apptListItem'}
                            onClick={() => onSelectAppointment(a.id)}
                          >
                            <div>
                              <div className="apptListTitleRow">
                                <div className="apptListTitle">{displayAppointmentId(a)}</div>
                                <div className="apptListMeta">{formatTimeRange(a.scheduledStartUtc, a.scheduledEndUtc)}</div>
                              </div>
                              <div className="apptListSub">
                                {a.truckId}
                                <span className="apptDot">•</span>
                                {a.driver}
                                <span className="apptDot">•</span>
                                {a.dock}
                              </div>
                            </div>
                            <Badge value={a.status} />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={view === 'list' ? 'apptView apptViewActive' : 'apptView apptViewInactive'}>
                <div className="apptTable">
                  <div className="apptTableHeader">
                    <button type="button" className="apptThBtn" onClick={() => toggleSort('date')}>Date</button>
                    <button type="button" className="apptThBtn" onClick={() => toggleSort('time')}>Time</button>
                    <div>ID</div>
                    <button type="button" className="apptThBtn" onClick={() => toggleSort('location')}>Location</button>
                    <div>Dock</div>
                    <button type="button" className="apptThBtn" onClick={() => toggleSort('status')}>Status</button>
                  </div>
                  {sortedRows.length === 0 ? (
                    <div className="tableEmpty">No appointments match the current filters.</div>
                  ) : (
                    sortedRows.map((a) => (
                        <button
                          type="button"
                          key={a.id}
                          className={a.id === selectedId ? 'apptTableRow active' : 'apptTableRow'}
                          onClick={() => onSelectAppointment(a.id)}
                        >
                          <div>{new Date(a.scheduledStartUtc).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                          <div>{formatTimeRange(a.scheduledStartUtc, a.scheduledEndUtc)}</div>
                          <div className="cellStrong">{displayAppointmentId(a)}</div>
                          <div>{a.location}</div>
                          <div>{a.dock}</div>
                          <div>
                            <Badge value={a.status} />
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>

        <aside className={detailsOpen ? 'apptDetails open' : 'apptDetails'} aria-label="Appointment details">
          <div className="apptDetailsInner">
            <div className="apptDetailsHeader">
              <div>
                <div className="apptDetailsTitle">Appointment Details</div>
                <div className="apptDetailsSub">
                  {selected ? (
                    <span className="apptMono">{displayAppointmentId(selected)}</span>
                  ) : (
                    'No selection'
                  )}
                </div>
              </div>
              <div className="apptDetailsActions">
                {!actionsDisabledReason ? (
                  <ActionButton variant="neutral" onClick={() => (selected ? openEdit(selected) : undefined)} disabled={!selected}>
                    Edit
                  </ActionButton>
                ) : null}

                {!actionsDisabledReason ? (
                  <ActionButton variant="neutral" onClick={() => (selected ? openReschedule(selected) : undefined)} disabled={!selected}>
                    Reschedule
                  </ActionButton>
                ) : null}

                {!actionsDisabledReason ? (
                  <ActionButton variant="danger" onClick={() => (selected ? openCancel(selected) : undefined)} disabled={!selected}>
                    Cancel
                  </ActionButton>
                ) : null}

                <ActionButton variant="danger" onClick={confirmDelete} disabled={!selected}>
                  Delete
                </ActionButton>
              </div>
            </div>

            {selected ? (
              <>
                <div className="apptCommandTop">
                  <div className="apptStatusRow">
                    <div className="apptStatusLeft">
                      <div className="apptStatusLabel">Current Status</div>
                      <div className="apptStatusValue">
                        <Badge value={selected.status} />
                      </div>
                    </div>
                    <div className="apptStatusRight">
                      <div className="apptStatusLabel">Scheduled Window</div>
                      <div className="apptStatusValue">
                        {new Date(selected.scheduledStartUtc).toLocaleDateString([], {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })}{' '}
                        <span className="apptStatusSep">•</span>
                        {formatTimeRange(selected.scheduledStartUtc, selected.scheduledEndUtc)}
                      </div>
                    </div>
                  </div>

                  <div className="apptLifecycle" aria-label="Appointment lifecycle">
                    {selected.status === 'Missed' || selected.status === 'Cancelled' ? (
                      <div className="apptLifecycleTerminal">
                        <div className="apptLifecycleTerminalTitle">Terminal Status</div>
                        <div className="apptLifecycleTerminalValue">
                          <Badge value={selected.status} />
                        </div>
                      </div>
                    ) : (
                      <div className="apptLifecycleSteps">
                        {APPOINTMENT_LIFECYCLE.map((step, idx) => {
                          const currentIdx = lifecycleIndexForStatus(selected.status);
                          const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'upcoming';
                          return (
                            <div key={step.key} className={`apptLifecycleStep ${state}`}>
                              <div className="apptLifecycleDot" aria-hidden />
                              <div className="apptLifecycleLabel">{step.label}</div>
                              {idx < APPOINTMENT_LIFECYCLE.length - 1 ? <div className="apptLifecycleLine" aria-hidden /> : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {actionsDisabledReason ? <div className="apptActionHint">{actionsDisabledReason}</div> : null}

                <div className="apptDetailsSections">
                  <div className="apptSection">
                    <div className="apptSectionTitle">Vehicle & Driver</div>
                    <div className="apptDetailsGrid">
                      <div className="apptDetailField">
                        <div className="apptDetailLabel">Truck/Vehicle ID</div>
                        <div className="apptDetailValue apptMono">{selected.truckId}</div>
                      </div>
                      <div className="apptDetailField">
                        <div className="apptDetailLabel">Assigned Driver</div>
                        <div className="apptDetailValue">{selected.driver}</div>
                      </div>
                    </div>
                  </div>

                  <div className="apptSection">
                    <div className="apptSectionTitle">Yard & Dock</div>
                    <div className="apptDetailsGrid">
                      <div className="apptDetailField">
                        <div className="apptDetailLabel">Location / Yard</div>
                        <div className="apptDetailValue">{selected.location}</div>
                      </div>
                      <div className="apptDetailField">
                        <div className="apptDetailLabel">Assigned Dock</div>
                        <div className="apptDetailValue">{selected.dock}</div>
                      </div>
                    </div>
                  </div>

                  <div className="apptSection">
                    <div className="apptSectionTitle">Appointment</div>
                    <div className="apptDetailsGrid">
                      <div className="apptDetailField">
                        <div className="apptDetailLabel">Appointment Type</div>
                        <div className="apptDetailValue">{selected.type}</div>
                      </div>
                      <div className="apptDetailField">
                        <div className="apptDetailLabel">Time Slot</div>
                        <div className="apptDetailValue">
                          {formatTimeRange(selected.scheduledStartUtc, selected.scheduledEndUtc)}
                        </div>
                      </div>
                      <div className="apptDetailField apptDetailSpan">
                        <div className="apptDetailLabel">Notes / Instructions</div>
                        <div className="apptDetailValue">{selected.notes ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="apptHistory">
                  <div className="apptHistoryTitle">Status History</div>
                  <div className="apptHistoryList">
                    {selected.history
                      .slice()
                      .sort((a, b) => new Date(b.atUtc).getTime() - new Date(a.atUtc).getTime())
                      .map((h, idx) => (
                        <div className="apptHistoryRow" key={`${h.status}-${h.atUtc}-${idx}`}>
                          <div className="apptHistoryDot" aria-hidden />
                          <div>
                            <div className="apptHistoryStatus">{h.note ?? h.status}</div>
                            <div className="apptHistoryTime">
                              {new Date(h.atUtc).toLocaleDateString([], {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                              })}{' '}
                              {new Date(h.atUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="emptyState">Select an appointment to view details.</div>
            )}
          </div>
        </aside>
      </div>

      {modal !== 'none' && modal !== 'cancel' && draft ? (
        <ModalShell
          title={
            modal === 'create'
              ? 'Add Appointment'
              : modal === 'reschedule'
                ? 'Reschedule Appointment'
                : 'Edit Appointment'
          }
          onClose={closeModal}
        >
          <div className="apptFormGrid">
            <label className="apptField">
              <div className="apptLabel">Yard</div>
              <select
                className="apptInput"
                value={draft.yardId}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => (d ? { ...d, yardId: v, dockId: '' } : d));
                  void ensureDocksLoaded(v);
                }}
                disabled={modal !== 'create'}
              >
                <option value="">Select yard…</option>
                {yards
                  .filter((y) => ['North Yard', 'East Yard', 'West Yard', 'South Yard'].includes(y.name))
                  .map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                  ))}
              </select>
            </label>

            <label className="apptField">
              <div className="apptLabel">Dock</div>
              <select
                className="apptInput"
                value={draft.dockId}
                onChange={(e) => setDraft((d) => (d ? { ...d, dockId: e.target.value } : d))}
                disabled={!draft.yardId}
              >
                <option value="">No dock</option>
                {dockOptionsForDraft.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="apptField">
              <div className="apptLabel">Date</div>
              <input
                className="apptInput"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => (d ? { ...d, date: e.target.value } : d))}
              />
            </label>

            <label className="apptField">
              <div className="apptLabel">Start</div>
              <input
                className="apptInput"
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft((d) => (d ? { ...d, startTime: e.target.value } : d))}
              />
            </label>

            <label className="apptField">
              <div className="apptLabel">End</div>
              <input
                className="apptInput"
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft((d) => (d ? { ...d, endTime: e.target.value } : d))}
              />
            </label>

            <label className="apptField">
              <div className="apptLabel">Appointment Type</div>
              <select
                className="apptInput"
                value={draft.type}
                onChange={(e) => setDraft((d) => (d ? { ...d, type: e.target.value } : d))}
              >
                <option value="Loading">Loading</option>
                <option value="Unloading">Unloading</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="apptField">
              <div className="apptLabel">Priority</div>
              <select
                className="apptInput"
                value={draft.priority}
                onChange={(e) => setDraft((d) => (d ? { ...d, priority: e.target.value as AppointmentPriority } : d))}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>

            <label className="apptField">
              <div className="apptLabel">Vehicle</div>
              <select
                className="apptInput"
                value={draft.vehicleId}
                onChange={(e) => setDraft((d) => (d ? { ...d, vehicleId: e.target.value } : d))}
              >
                <option value="">Unassigned</option>
                {vehicleOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} {v.driverName ? `• ${v.driverName}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {modal !== 'create' ? (
              <label className="apptField">
                <div className="apptLabel">Status</div>
                <select
                  className="apptInput"
                  value={draft.status}
                  onChange={(e) => setDraft((d) => (d ? { ...d, status: e.target.value as AppointmentStatus } : d))}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="CheckedIn">Checked In</option>
                  <option value="Completed">Completed</option>
                  <option value="Missed">Missed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>
            ) : (
              <div className="apptField apptFieldGhost" aria-hidden="true">
                <div className="apptLabel">Status</div>
                <div className="apptInput" />
              </div>
            )}

            <label className="apptField apptFieldSpan">
              <div className="apptLabel">Notes</div>
              <textarea
                className="apptTextarea"
                value={draft.notes}
                onChange={(e) => setDraft((d) => (d ? { ...d, notes: e.target.value } : d))}
                rows={4}
              />
            </label>
          </div>

          {modalError ? <div className="ymsError">{modalError}</div> : null}

          <div className="apptModalActions">
            <button className="apptModalBtn" onClick={closeModal} disabled={modalBusy} type="button">
              Cancel
            </button>
            {modal === 'edit' ? (
              <button className="apptModalBtn danger" onClick={confirmDelete} disabled={modalBusy} type="button">
                {modalBusy ? 'Deleting…' : 'Delete'}
              </button>
            ) : null}
            <button
              className="apptModalBtn primary"
              onClick={modal === 'create' ? saveCreate : saveEdit}
              disabled={modalBusy}
              type="button"
            >
              {modalBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {modal === 'cancel' && selected && draft ? (
        <ModalShell title="Cancel appointment" onClose={closeModal}>
          <div className="apptConfirmText">This will cancel {displayAppointmentId(selected)}. Please provide a reason.</div>
          <label className="apptField apptFieldSpan">
            <div className="apptLabel">Reason (required)</div>
            <textarea
              className="apptTextarea"
              value={draft.reason}
              onChange={(e) => setDraft((d) => (d ? { ...d, reason: e.target.value } : d))}
              rows={4}
            />
          </label>
          {modalError ? <div className="ymsError">{modalError}</div> : null}
          <div className="apptModalActions">
            <button className="apptModalBtn" onClick={closeModal} disabled={modalBusy} type="button">
              Keep Appointment
            </button>
            <button className="apptModalBtn danger" onClick={confirmCancel} disabled={modalBusy} type="button">
              {modalBusy ? 'Cancelling…' : 'Cancel Appointment'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
