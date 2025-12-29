import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { hasVehiclePermission } from '../../auth/permissions';
import * as vehiclesApi from '../../api/vehicles';
import * as usersApi from '../../api/users';
import { Badge } from '../Dashboard/components/Badge';
import { DashboardCard } from '../Dashboard/components/DashboardCard';

import './VehiclesPage.css';

type Vehicle = vehiclesApi.VehicleDto;
type DriverUser = usersApi.UserDto;

type VehicleType = 'ContainerTruck' | 'FlatbedTruck' | 'ReeferTruck' | 'TankerTruck' | 'BoxTruck';

type VehicleCreateForm = {
  vehicleNumber: string;
  trailerNumber: string;
  type: VehicleType;
  driverUserId: string;
  carrierName: string;
  licensePlate: string;
  notes: string;
};

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="vehModalOverlay" role="dialog" aria-modal="true">
      <div className="vehModal">
        <div className="vehModalHeader">
          <div className="vehModalTitle">{title}</div>
          <button className="vehIconBtn" onClick={onClose} aria-label="Close" type="button">
            ✕
          </button>
        </div>
        <div className="vehModalBody">{children}</div>
      </div>
    </div>
  );
}

function safeLower(v: string | null | undefined) {
  return (v ?? '').trim().toLowerCase();
}

function prettyErrorMessage(err: unknown): string {
  const fallback = err instanceof Error ? err.message : 'Request failed';
  const raw = err instanceof Error ? err.message : '';
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = JSON.parse(trimmed) as { title?: string; detail?: string; message?: string; errors?: Record<string, string[]> };
    const msg = parsed.message || parsed.detail || parsed.title;
    if (msg) {
      const extra = parsed.errors
        ? Object.entries(parsed.errors)
            .flatMap(([, v]) => v)
            .filter(Boolean)
            .join(' ')
        : '';
      return [msg, extra].filter(Boolean).join(' ');
    }
  } catch {
    // ignore parse errors
  }

  return fallback;
}

async function fetchAllDriverUsers(): Promise<DriverUser[]> {
  const pageSize = 100;
  let page = 1;
  const all: DriverUser[] = [];

  while (true) {
    const res = await usersApi.getUsers({ page, pageSize, role: 'Driver', isActive: true, search: undefined });
    all.push(...res.items);
    if (page >= (res.totalPages || 0)) break;
    if (res.items.length < pageSize) break;
    page += 1;
    if (page > 50) break;
  }

  return all;
}

export function VehiclesPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const canView = hasVehiclePermission(role, 'vehicles.view');
  const canManage = hasVehiclePermission(role, 'vehicles.assign');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverUsers, setDriverUsers] = useState<DriverUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleCreateForm>({
    vehicleNumber: '',
    trailerNumber: '',
    type: 'ContainerTruck',
    driverUserId: '',
    carrierName: '',
    licensePlate: '',
    notes: '',
  });

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkVehicle, setLinkVehicle] = useState<Vehicle | null>(null);
  const [linkDriverUserId, setLinkDriverUserId] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);

  async function refresh() {
    if (!canView) return;

    setLoading(true);
    setError(null);
    try {
      const [v, d] = await Promise.all([
        vehiclesApi.getVehicles({ take: 250 }),
        fetchAllDriverUsers(),
      ]);
      setVehicles(v);
      setDriverUsers(d);
    } catch (e) {
      setError(prettyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const filtered = useMemo(() => {
    const q = safeLower(search);
    if (!q) return vehicles;

    return vehicles.filter((v) => {
      const hay = [v.vehicleNumber, v.trailerNumber ?? '', v.type, v.status, v.driverName ?? '', v.dockName ?? '', v.yardSectionName ?? ''].join(' ');
      return safeLower(hay).includes(q);
    });
  }, [search, vehicles]);

  const driverOptions = useMemo(() => {
    return driverUsers
      .slice()
      .sort((a, b) => {
        const an = (a.fullName || a.username || '').trim();
        const bn = (b.fullName || b.username || '').trim();
        return an.localeCompare(bn);
      });
  }, [driverUsers]);

  async function submitCreate() {
    setCreateError(null);

    if (!form.vehicleNumber.trim()) {
      setCreateError('Vehicle number is required.');
      return;
    }

    setCreateBusy(true);
    try {
      const payload: vehiclesApi.CreateVehicleDto = {
        vehicleNumber: form.vehicleNumber.trim(),
        trailerNumber: form.trailerNumber.trim() ? form.trailerNumber.trim() : null,
        type: form.type,
        driverId: null,
        carrierName: form.carrierName.trim() || undefined,
        licensePlate: form.licensePlate.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      const created = await vehiclesApi.createVehicle(payload);

      if (canManage && form.driverUserId.trim()) {
        try {
          const updated = await vehiclesApi.updateVehicleDriverUser(created.id, { userId: form.driverUserId.trim() });
          setVehicles((prev) => [updated, ...prev]);
        } catch {
          setVehicles((prev) => [created, ...prev]);
        }
      } else {
        setVehicles((prev) => [created, ...prev]);
      }
      setCreateOpen(false);
      setForm({ vehicleNumber: '', trailerNumber: '', type: 'ContainerTruck', driverUserId: '', carrierName: '', licensePlate: '', notes: '' });
    } catch (e) {
      setCreateError(prettyErrorMessage(e));
    } finally {
      setCreateBusy(false);
    }
  }

  function openLink(v: Vehicle) {
    setLinkVehicle(v);
    setLinkDriverUserId('');
    setLinkError(null);
    setLinkOpen(true);
  }

  function openDelete(v: Vehicle) {
    setDeleteVehicle(v);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function submitDelete() {
    if (!deleteVehicle) return;
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await vehiclesApi.deleteVehicle(deleteVehicle.id);
      setVehicles((prev) => prev.filter((v) => v.id !== deleteVehicle.id));
      setDeleteOpen(false);
      setDeleteVehicle(null);
    } catch (e) {
      setDeleteError(prettyErrorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function submitLink() {
    if (!linkVehicle) return;

    setLinkError(null);
    setLinkBusy(true);
    try {
      const updated = await vehiclesApi.updateVehicleDriverUser(linkVehicle.id, {
        userId: linkDriverUserId.trim() ? linkDriverUserId.trim() : null,
      });
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setLinkOpen(false);
      setLinkVehicle(null);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to link driver');
    } finally {
      setLinkBusy(false);
    }
  }

  if (!canView) {
    return (
      <div className="ymsPage">
        <div className="ymsPageHeader">
          <div>
            <div className="ymsPageTitle">Vehicles</div>
            <div className="ymsPageSub">You do not have access to Vehicles.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ymsPage">
      <div className="ymsPageHeader">
        <div>
          <div className="ymsPageTitle">Vehicles</div>
          <div className="ymsPageSub"></div>
        </div>
        <div className="vehHeaderActions">
          <label className="vehSearchWrap">
            <span className="vehSearchIcon" aria-hidden>
              ⌕
            </span>
            <input
              className="vehSearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vehicle, driver, trailer, or location…"
            />
            {search ? (
              <button className="vehSearchClear" onClick={() => setSearch('')} type="button" aria-label="Clear search">
                ✕
              </button>
            ) : null}
          </label>

          <button className="vehBtn" onClick={refresh} disabled={loading} type="button">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>

          {canManage ? (
            <button className="vehBtn vehBtnPrimary" onClick={() => setCreateOpen(true)} type="button">
              Add Vehicle
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="ymsError">{error}</div> : null}

      <DashboardCard title="Vehicle List" description={`${filtered.length} vehicles`}>
        <div className="vehTable">
          <div className="vehTableHeader vehTableCols">
            <div></div>
            <div>Vehicle</div>
            <div>Type</div>
            <div>Status</div>
            <div>Driver</div>
            <div>Location</div>
            <div className="vehActionsHeader">Actions</div>
          </div>

          {filtered.map((v) => (
            <div key={v.id} className="vehTableRow vehTableCols">
              <div>
                <input type="checkbox" disabled aria-hidden />
              </div>
              <div>
                <div className="vehStrong">{v.vehicleNumber}</div>
                <div className="vehMuted">{v.trailerNumber ? `Trailer: ${v.trailerNumber}` : ''}</div>
              </div>
              <div>{v.type}</div>
              <div>
                <Badge value={v.isOnHold ? `${v.status} • OnHold` : v.status} />
              </div>
              <div>
                {v.driverName ? <span className="vehDriverName">{v.driverName}</span> : <span className="vehNotAssigned">Not Assigned</span>}
              </div>
              <div>{v.dockName ?? v.yardSectionName ?? '—'}</div>
              <div className="vehRowActions">
                {canManage ? (
                  <button className="vehBtn" type="button" onClick={() => openLink(v)}>
                    Link Driver
                  </button>
                ) : null}
                {canManage ? (
                  <button className="vehBtn vehBtnDanger vehBtnSmall" type="button" onClick={() => openDelete(v)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          {filtered.length === 0 ? (
            <div className="vehEmptyState">
              <div className="vehEmptyTitle">No vehicles found</div>
              <div className="vehEmptySub">Try adjusting your search, or add a vehicle to get started.</div>
            </div>
          ) : null}
        </div>
      </DashboardCard>

      {createOpen ? (
        <ModalShell title="Add Vehicle" onClose={() => setCreateOpen(false)}>
          {createError ? <div className="ymsError">{createError}</div> : null}

          <div className="vehForm">
            <label className="vehField">
              <div className="vehLabel">Vehicle Number</div>
              <input className="vehInput" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
            </label>

            <label className="vehField">
              <div className="vehLabel">Trailer Number</div>
              <input className="vehInput" value={form.trailerNumber} onChange={(e) => setForm({ ...form, trailerNumber: e.target.value })} />
            </label>

            <label className="vehField">
              <div className="vehLabel">Type</div>
              <select className="vehSelect" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })}>
                <option value="ContainerTruck">Container Truck</option>
                <option value="FlatbedTruck">Flatbed Truck</option>
                <option value="ReeferTruck">Reefer Truck</option>
                <option value="TankerTruck">Tanker Truck</option>
                <option value="BoxTruck">Box Truck</option>
              </select>
            </label>

            {canManage ? (
              <label className="vehField">
                <div className="vehLabel">Assigned Driver</div>
                <select className="vehSelect" value={form.driverUserId} onChange={(e) => setForm({ ...form, driverUserId: e.target.value })}>
                  <option value="">No driver</option>
                  {driverOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username} ({u.phone || '—'})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="vehField">
              <div className="vehLabel">Carrier Name (optional)</div>
              <input className="vehInput" value={form.carrierName} onChange={(e) => setForm({ ...form, carrierName: e.target.value })} />
            </label>

            <label className="vehField">
              <div className="vehLabel">License Plate (optional)</div>
              <input className="vehInput" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
            </label>

            <label className="vehField" style={{ gridColumn: '1 / -1' }}>
              <div className="vehLabel">Notes (optional)</div>
              <input className="vehInput" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>

          <div className="vehModalActions">
            <button className="vehBtn" onClick={() => setCreateOpen(false)} type="button" disabled={createBusy}>
              Cancel
            </button>
            <button className="vehBtn vehBtnPrimary" onClick={submitCreate} type="button" disabled={createBusy}>
              {createBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {linkOpen && linkVehicle ? (
        <ModalShell title={`Link Driver • ${linkVehicle.vehicleNumber}`} onClose={() => setLinkOpen(false)}>
          {linkError ? <div className="ymsError">{linkError}</div> : null}

          <label className="vehField">
            <div className="vehLabel">Driver</div>
            <select className="vehSelect" value={linkDriverUserId} onChange={(e) => setLinkDriverUserId(e.target.value)}>
              <option value="">No driver</option>
              {driverOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.username} ({u.phone || '—'})
                </option>
              ))}
            </select>
          </label>

          <div className="vehModalActions">
            <button className="vehBtn" onClick={() => setLinkOpen(false)} type="button" disabled={linkBusy}>
              Cancel
            </button>
            <button className="vehBtn vehBtnPrimary" onClick={submitLink} type="button" disabled={linkBusy}>
              {linkBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {deleteOpen && deleteVehicle ? (
        <ModalShell title={`Delete Vehicle • ${deleteVehicle.vehicleNumber}`} onClose={() => setDeleteOpen(false)}>
          {deleteError ? <div className="ymsError">{deleteError}</div> : null}

          <div className="vehConfirmText">
            This will permanently remove the vehicle from the system. This action cannot be undone.
          </div>

          <div className="vehModalActions">
            <button className="vehBtn" onClick={() => setDeleteOpen(false)} type="button" disabled={deleteBusy}>
              Cancel
            </button>
            <button className="vehBtn vehBtnDanger" onClick={submitDelete} type="button" disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
