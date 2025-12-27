import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '../Dashboard/components/Badge';
import { DashboardCard } from '../Dashboard/components/DashboardCard';
import { getAppointments, type AppointmentDto } from '../../api/appointments';

import './AppointmentsPage.css';

type AppointmentStatus = 'Scheduled' | 'CheckedIn' | 'Completed' | 'Missed' | 'Cancelled';

type Appointment = {
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
  { status: 'CheckedIn', label: 'Checked In', color: '#f59e0b' },
  { status: 'Completed', label: 'Completed', color: '#22c55e' },
  { status: 'Missed', label: 'Missed', color: '#ef4444' },
  { status: 'Cancelled', label: 'Cancelled', color: '#94a3b8' },
];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function ActionButton({
  children,
  variant,
  onClick,
}: {
  children: string;
  variant: 'neutral' | 'danger';
  onClick: () => void;
}) {
  const cls = variant === 'danger' ? 'apptBtn danger' : 'apptBtn';
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function AppointmentsPage() {
  const [view, setView] = useState<ViewMode>('calendar');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('All');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [activeStatus, setActiveStatus] = useState<AppointmentStatus | 'All'>('All');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAppointments = useMemo<Appointment[]>(() => {
    const base = new Date();
    const day = (offset: number, h1: number, m1: number, h2: number, m2: number) => {
      const s = new Date(base);
      s.setDate(base.getDate() + offset);
      s.setHours(h1, m1, 0, 0);
      const e = new Date(base);
      e.setDate(base.getDate() + offset);
      e.setHours(h2, m2, 0, 0);
      return { s: s.toISOString(), e: e.toISOString() };
    };

    const d0 = day(0, 8, 0, 9, 0);
    const d1 = day(0, 10, 30, 11, 30);
    const d2 = day(1, 14, 0, 15, 30);
    const d3 = day(-2, 9, 0, 9, 45);
    const d4 = day(3, 16, 0, 17, 0);

    return [
      {
        id: 'APP001',
        status: 'Scheduled',
        scheduledStartUtc: d0.s,
        scheduledEndUtc: d0.e,
        truckId: 'TRK101',
        driver: 'John Smith',
        dock: 'Dock 1',
        location: 'North Yard',
        type: 'Unloading',
        notes: 'Requires forklift assistance upon arrival.',
        history: [
          { status: 'Scheduled', atUtc: day(-7, 10, 0, 10, 0).s },
          { status: 'Scheduled', atUtc: day(-6, 14, 30, 14, 30).s, note: 'Confirmed by driver' },
        ],
      },
      {
        id: 'APP002',
        status: 'CheckedIn',
        scheduledStartUtc: d1.s,
        scheduledEndUtc: d1.e,
        truckId: 'TRK204',
        driver: 'Ava Johnson',
        dock: 'Dock 2',
        location: 'North Yard',
        type: 'Loading',
        notes: 'Hazmat paperwork at gate.',
        history: [
          { status: 'Scheduled', atUtc: day(-4, 9, 0, 9, 0).s },
          { status: 'CheckedIn', atUtc: day(0, 10, 5, 10, 5).s },
        ],
      },
      {
        id: 'APP003',
        status: 'Completed',
        scheduledStartUtc: d3.s,
        scheduledEndUtc: d3.e,
        truckId: 'TRK332',
        driver: 'David Lee',
        dock: 'Dock 4',
        location: 'South Yard',
        type: 'Unloading',
        history: [
          { status: 'Scheduled', atUtc: day(-10, 9, 30, 9, 30).s },
          { status: 'CheckedIn', atUtc: day(-2, 8, 55, 8, 55).s },
          { status: 'Completed', atUtc: day(-2, 9, 50, 9, 50).s },
        ],
      },
      {
        id: 'APP004',
        status: 'Missed',
        scheduledStartUtc: d2.s,
        scheduledEndUtc: d2.e,
        truckId: 'TRK009',
        driver: 'Mia Patel',
        dock: 'Dock 3',
        location: 'South Yard',
        type: 'Loading',
        notes: 'No-show after grace period.',
        history: [
          { status: 'Scheduled', atUtc: day(-3, 12, 0, 12, 0).s },
          { status: 'Missed', atUtc: day(1, 15, 45, 15, 45).s },
        ],
      },
      {
        id: 'APP005',
        status: 'Cancelled',
        scheduledStartUtc: d4.s,
        scheduledEndUtc: d4.e,
        truckId: 'TRK551',
        driver: 'Noah Garcia',
        dock: 'Dock 5',
        location: 'West Yard',
        type: 'Unloading',
        notes: 'Carrier cancelled due to maintenance.',
        history: [
          { status: 'Scheduled', atUtc: day(-1, 8, 15, 8, 15).s },
          { status: 'Cancelled', atUtc: day(0, 12, 0, 12, 0).s },
        ],
      },
    ];
  }, []);

  const [appointments, setAppointments] = useState<Appointment[]>(demoAppointments);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void getAppointments()
      .then((items) => {
        if (!mounted) return;
        const mapped: Appointment[] = (items ?? []).map((a: AppointmentDto) => ({
          id: a.id,
          status: a.status,
          scheduledStartUtc: a.scheduledStartUtc,
          scheduledEndUtc: a.scheduledEndUtc,
          truckId: a.truckId,
          driver: a.driver,
          dock: a.dock,
          location: a.location,
          type: a.type,
          notes: a.notes,
          history: a.history ?? [],
        }));

        setAppointments(mapped.length > 0 ? mapped : demoAppointments);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load appointments');
        setAppointments(demoAppointments);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [demoAppointments]);

  const counts = useMemo(() => {
    const map: Record<AppointmentStatus, number> = {
      Scheduled: 0,
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
      if (location !== 'All' && a.location !== location) return false;
      if (q) {
        const hay = `${a.id} ${a.truckId} ${a.driver} ${a.dock} ${a.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, activeStatus, location, query]);

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = useMemo(() => filtered.find((a) => a.id === selectedId) ?? null, [filtered, selectedId]);

  const locations = useMemo(() => {
    const unique = new Set(appointments.map((a) => a.location));
    return ['All', ...Array.from(unique).sort()];
  }, [appointments]);

  const monthCursor = useMemo(() => startOfMonth(selectedDate), [selectedDate]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const startWeekday = start.getDay();
    const gridStart = addDays(start, -startWeekday);
    const total = 42;

    return Array.from({ length: total }).map((_, i) => {
      const date = addDays(gridStart, i);
      const inMonth = date.getMonth() === monthCursor.getMonth();
      const items = filtered.filter((a) => sameDay(new Date(a.scheduledStartUtc), date));
      return { date, inMonth, items };
    });
  }, [filtered, monthCursor]);

  const onSelectAppointment = (id: string) => {
    setSelectedId(id);
    setDetailsOpen(true);
  };

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
          <button type="button" className="apptPrimaryAction" onClick={() => setDetailsOpen(true)}>
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
                <div className="apptToggle" role="tablist" aria-label="Appointments view">
                  <button
                    type="button"
                    className={view === 'calendar' ? 'apptToggleBtn active' : 'apptToggleBtn'}
                    onClick={() => setView('calendar')}
                    role="tab"
                    aria-selected={view === 'calendar'}
                  >
                    Calendar View
                  </button>
                  <button
                    type="button"
                    className={view === 'list' ? 'apptToggleBtn active' : 'apptToggleBtn'}
                    onClick={() => setView('list')}
                    role="tab"
                    aria-selected={view === 'list'}
                  >
                    List View
                  </button>
                </div>

                <select value={location} onChange={(e) => setLocation(e.target.value)} className="apptSelect">
                  {locations.map((l) => (
                    <option key={l} value={l}>
                      {l === 'All' ? 'Filter by Location' : l}
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

                <button type="button" className="apptIconBtn" onClick={() => setDetailsOpen((v) => !v)}>
                  {detailsOpen ? 'Hide Details' : 'Show Details'}
                </button>
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
                        role="gridcell"
                        aria-selected={isSelected}
                      >
                        <div className="apptCalendarDayTop">
                          <span className="apptCalendarDayNum">{date.getDate()}</span>
                          {items.length > 0 ? <span className="apptCalendarDayPill">{items.length}</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="apptDayList">
                  <div className="apptDayListTitle">
                    Appointments on{' '}
                    {selectedDate.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                  </div>
                  {filtered.filter((a) => sameDay(new Date(a.scheduledStartUtc), selectedDate)).length === 0 ? (
                    <div className="emptyState">No appointments for this date.</div>
                  ) : (
                    <div className="apptList">
                      {filtered
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
                                <div className="apptListTitle">{a.id}</div>
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
                    <div>ID</div>
                    <div>Window</div>
                    <div>Truck</div>
                    <div>Driver</div>
                    <div>Dock</div>
                    <div>Status</div>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="tableEmpty">No appointments match the current filters.</div>
                  ) : (
                    filtered
                      .slice()
                      .sort((a, b) => new Date(a.scheduledStartUtc).getTime() - new Date(b.scheduledStartUtc).getTime())
                      .map((a) => (
                        <button
                          type="button"
                          key={a.id}
                          className={a.id === selectedId ? 'apptTableRow active' : 'apptTableRow'}
                          onClick={() => onSelectAppointment(a.id)}
                        >
                          <div className="cellStrong">{a.id}</div>
                          <div>{formatTimeRange(a.scheduledStartUtc, a.scheduledEndUtc)}</div>
                          <div>{a.truckId}</div>
                          <div>{a.driver}</div>
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
                <div className="apptDetailsSub">{selected ? selected.id : 'No selection'}</div>
              </div>
              <div className="apptDetailsActions">
                <ActionButton variant="neutral" onClick={() => {}}>
                  Edit
                </ActionButton>
                <ActionButton variant="neutral" onClick={() => {}}>
                  Reschedule
                </ActionButton>
                <ActionButton variant="danger" onClick={() => {}}>
                  Cancel
                </ActionButton>
              </div>
            </div>

            {selected ? (
              <>
                <div className="apptDetailsGrid">
                  <div className="apptDetailField">
                    <div className="apptDetailLabel">Status</div>
                    <div className="apptDetailValue">
                      <Badge value={selected.status} />
                    </div>
                  </div>

                  <div className="apptDetailField">
                    <div className="apptDetailLabel">Date</div>
                    <div className="apptDetailValue">
                      {new Date(selected.scheduledStartUtc).toLocaleDateString([], {
                        month: 'long',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="apptDetailField">
                    <div className="apptDetailLabel">Time</div>
                    <div className="apptDetailValue">
                      {formatTimeRange(selected.scheduledStartUtc, selected.scheduledEndUtc)}
                    </div>
                  </div>

                  <div className="apptDetailField">
                    <div className="apptDetailLabel">Truck/Vehicle ID</div>
                    <div className="apptDetailValue">{selected.truckId}</div>
                  </div>

                  <div className="apptDetailField">
                    <div className="apptDetailLabel">Driver</div>
                    <div className="apptDetailValue">{selected.driver}</div>
                  </div>

                  <div className="apptDetailField">
                    <div className="apptDetailLabel">Assigned Yard/Dock</div>
                    <div className="apptDetailValue">{selected.dock}</div>
                  </div>

                  <div className="apptDetailField">
                    <div className="apptDetailLabel">Appointment Type</div>
                    <div className="apptDetailValue">{selected.type}</div>
                  </div>

                  <div className="apptDetailField apptDetailSpan">
                    <div className="apptDetailLabel">Notes</div>
                    <div className="apptDetailValue">{selected.notes ?? '—'}</div>
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
    </div>
  );
}
