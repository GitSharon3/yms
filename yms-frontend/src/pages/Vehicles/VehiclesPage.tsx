/**
 * Vehicle Management Page Component
 * 
 * This component provides a comprehensive interface for managing vehicles in the YMS system.
 * It includes functionality for viewing, creating, editing, deleting vehicles, and managing driver assignments.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../../auth/AuthContext';
import { hasVehiclePermission } from '../../auth/permissions';
import * as vehiclesApi from '../../api/vehicles';
import * as usersApi from '../../api/users';
import { Badge } from '../Dashboard/components/Badge';
import { DashboardCard } from '../Dashboard/components/DashboardCard';

import './VehiclesPage.css';

// Type aliases for API DTOs for cleaner code
type Vehicle = vehiclesApi.VehicleDto;
type DriverUser = usersApi.UserDto;

// Supported vehicle types in the system
export type VehicleType = 'ContainerTruck' | 'FlatbedTruck' | 'ReeferTruck' | 'TankerTruck' | 'BoxTruck';

// Form data structure for creating a new vehicle
export type VehicleCreateForm = {
  trailerNumber: string;
  type: VehicleType;
  licensePlate: string;
};

// Form data structure for editing an existing vehicle
export type VehicleEditForm = {
  trailerNumber: string;
  type: VehicleType;
  licensePlate: string;
};

/**
 * Formats a vehicle number to the standard VEH-XXXXX format
 * 
 * @param vehicleNumber - The raw vehicle number string
 * @returns Formatted vehicle ID (e.g., "VEH-00001") or "—" if empty
 * 
 * @example
 * formatVehicleId("1") -> "VEH-00001"
 * formatVehicleId("VEH-123") -> "VEH-00123"
 * formatVehicleId("") -> "—"
 */
function formatVehicleId(vehicleNumber: string): string {
  const raw = (vehicleNumber || '').trim();
  if (!raw) return '—';
  if (/^VEH-\d+$/i.test(raw)) return raw.toUpperCase();

  const m = raw.match(/(\d{1,})/);
  if (!m) return raw;

  const n = Number(m[1]);
  if (!Number.isFinite(n)) return raw;
  return `VEH-${String(n).padStart(5, '0')}`;
}

/**
 * Extracts the numeric sequence from a vehicle number
 * 
 * @param vehicleNumber - The vehicle number string
 * @returns The numeric sequence as a number, or null if not found
 * 
 * @example
 * extractVehicleSequence("VEH-00123") -> 123
 * extractVehicleSequence("123") -> 123
 * extractVehicleSequence("ABC") -> null
 */
function extractVehicleSequence(vehicleNumber: string): number | null {
  const raw = (vehicleNumber || '').trim();
  if (!raw) return null;
  const m = raw.match(/(\d{1,})/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Generates the next vehicle ID based on existing vehicles
 * 
 * @param vehicles - Array of existing vehicles
 * @returns The next vehicle ID in VEH-XXXXX format
 * 
 * @example
 * // If vehicles have IDs VEH-00001, VEH-00002
 * nextVehicleId(vehicles) -> "VEH-00003"
 */
function nextVehicleId(vehicles: Vehicle[]): string {
  const max = vehicles
    .map((v) => extractVehicleSequence(v.vehicleNumber))
    .filter((n): n is number => typeof n === 'number')
    .reduce((a, b) => Math.max(a, b), 0);
  return `VEH-${String(max + 1).padStart(5, '0')}`;
}

/**
 * Modal shell component for consistent modal dialog layout
 * 
 * @param title - Modal title displayed in the header
 * @param children - Modal content to be rendered in the body
 * @param onClose - Callback function when modal should close
 */
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

/**
 * Utility function to safely convert string to lowercase
 * 
 * @param v - Input string that may be null or undefined
 * @returns Lowercase trimmed string or empty string if input is falsy
 */
function safeLower(v: string | null | undefined) {
  return (v ?? '').trim().toLowerCase();
}

/**
 * Extracts and formats user-friendly error messages from API responses
 * 
 * @param err - Error object from API call
 * @returns Formatted error message string
 * 
 * Handles various error formats:
 * - Error objects with message property
 * - JSON strings with validation errors
 * - Network errors
 */
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
    // ignore parse errors - return fallback message
  }

  return fallback;
}

/**
 * Fetches all active driver users from the API with pagination
 * 
 * @returns Promise resolving to array of driver users
 * 
 * This function handles pagination automatically to retrieve all drivers,
 * not just the first page. It includes safety limits to prevent infinite loops.
 */
async function fetchAllDriverUsers(): Promise<DriverUser[]> {
  const pageSize = 100;
  let page = 1;
  const all: DriverUser[] = [];

  while (true) {
    const res = await usersApi.getUsers({ page, pageSize, role: 'Driver', isActive: true, search: undefined });
    all.push(...res.items);
    
    // Stop if we've reached the last page
    if (page >= (res.totalPages || 0)) break;
    
    // Stop if we got fewer items than page size (indicates last page)
    if (res.items.length < pageSize) break;
    
    page += 1;
    
    // Safety limit to prevent infinite loops
    if (page > 50) break;
  }

  return all;
}

/**
 * Main Vehicles Page Component
 * 
 * Manages the complete vehicle lifecycle including CRUD operations,
 * driver assignments, filtering, and search functionality.
 */
export function VehiclesPage() {
  // Authentication and authorization
  const { user } = useAuth();
  const role = user?.role ?? '';

  // Permission checks for different operations
  const canView = hasVehiclePermission(role, 'vehicles.view');
  const canManage = hasVehiclePermission(role, 'vehicles.assign');

  // Core data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);           // All vehicles from API
  const [driverUsers, setDriverUsers] = useState<DriverUser[]>([]);  // All available drivers
  const [loading, setLoading] = useState(false);                    // Loading state for data fetch
  const [error, setError] = useState<string | null>(null);          // Global error state

  // UI state for filtering and searching
  const [search, setSearch] = useState('');                          // Search query string
  const [typeFilter, setTypeFilter] = useState<'All' | VehicleType>('All'); // Vehicle type filter

  // Create vehicle modal state
  const [createOpen, setCreateOpen] = useState(false);               // Modal visibility
  const [createBusy, setCreateBusy] = useState(false);               // Form submission state
  const [createError, setCreateError] = useState<string | null>(null); // Form validation errors
  const [createVehicleId, setCreateVehicleId] = useState('');        // Auto-generated vehicle ID
  const [form, setForm] = useState<VehicleCreateForm>({             // Create form data
    trailerNumber: '',
    type: 'ContainerTruck',
    licensePlate: '',
  });

  // Edit vehicle modal state
  const [editOpen, setEditOpen] = useState(false);                   // Modal visibility
  const [editBusy, setEditBusy] = useState(false);                   // Form submission state
  const [editError, setEditError] = useState<string | null>(null);   // Form validation errors
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null); // Vehicle being edited
  const [editForm, setEditForm] = useState<VehicleEditForm>({ trailerNumber: '', type: 'ContainerTruck', licensePlate: '' }); // Edit form data

  // View vehicle details modal state
  const [viewOpen, setViewOpen] = useState(false);                   // Modal visibility
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null); // Vehicle being viewed

  // Row menu (dropdown) state for table actions
  const [rowMenuOpenForId, setRowMenuOpenForId] = useState<string | null>(null); // Which row's menu is open
  const [rowMenuPos, setRowMenuPos] = useState<{ left: number; top: number; openUp: boolean } | null>(null); // Menu positioning

  // Link driver modal state
  const [linkOpen, setLinkOpen] = useState(false);                   // Modal visibility
  const [linkBusy, setLinkBusy] = useState(false);                   // Form submission state
  const [linkError, setLinkError] = useState<string | null>(null);   // Form validation errors
  const [linkVehicle, setLinkVehicle] = useState<Vehicle | null>(null); // Vehicle being linked
  const [linkDriverUserId, setLinkDriverUserId] = useState('');      // Selected driver ID

  // Delete vehicle modal state
  const [deleteOpen, setDeleteOpen] = useState(false);               // Modal visibility
  const [deleteBusy, setDeleteBusy] = useState(false);               // Deletion progress state
  const [deleteError, setDeleteError] = useState<string | null>(null); // Deletion error state
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null); // Vehicle being deleted

  /**
   * Refreshes vehicles and driver data from the API
   * 
   * Fetches both vehicles and drivers in parallel for optimal performance.
   * Updates loading states and handles errors appropriately.
   */
  async function refresh() {
    if (!canView) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch vehicles and drivers in parallel for better performance
      const [v, d] = await Promise.all([
        vehiclesApi.getVehicles({ take: 250 }),  // Get up to 250 vehicles
        fetchAllDriverUsers(),                  // Get all active drivers
      ]);
      setVehicles(v);
      setDriverUsers(d);
    } catch (e) {
      setError(prettyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  // Load data on component mount and when permissions change
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  /**
   * Event listener effect for row menu (dropdown) management
   * 
   * Handles closing the dropdown menu when:
   * - User clicks outside the menu
   * - User touches outside (mobile)
   * - User presses Escape key
   * - Window is scrolled or resized
   */
  useEffect(() => {
    if (!rowMenuOpenForId) return;

    function onDocPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Don't close if clicking inside menu elements
      if (target.closest('.vehMenuWrap')) return;
      if (target.closest('.vehMenuFixed')) return;
      setRowMenuOpenForId(null);
      setRowMenuPos(null);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setRowMenuOpenForId(null);
        setRowMenuPos(null);
      }
    }

    // Add event listeners for menu closing
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('touchstart', onDocPointerDown);
    document.addEventListener('keydown', onDocKeyDown);

    // Close menu on scroll/resize to prevent misalignment
    function onWin() {
      setRowMenuOpenForId(null);
      setRowMenuPos(null);
    }

    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    
    // Cleanup event listeners on unmount or menu close
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('touchstart', onDocPointerDown);
      document.removeEventListener('keydown', onDocKeyDown);
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [rowMenuOpenForId]);

  /**
   * Utility function to format cell text for display
   * 
   * @param v - Input value that may be null or undefined
   * @returns Trimmed string or empty string if input is falsy
   */
  function cellText(v: string | null | undefined): string {
    const t = (v ?? '').trim();
    return t;
  }

  /**
   * Memoized filtered vehicles based on search query and type filter
   * 
   * Filters vehicles by:
   * - Vehicle type (if not "All")
   * - Search query across vehicle ID, license plate, trailer number, type, and driver name
   */
  const filtered = useMemo(() => {
    const q = safeLower(search);

    return vehicles
      // Filter by vehicle type
      .filter((v) => {
        if (typeFilter === 'All') return true;
        return String(v.type || '').trim() === typeFilter;
      })
      // Filter by search query
      .filter((v) => {
        if (!q) return true;
        // Search across multiple fields for comprehensive results
        const hay = [v.vehicleNumber, v.licensePlate ?? '', v.trailerNumber ?? '', v.type, v.driverName ?? ''].join(' ');
        return safeLower(hay).includes(q);
      });
  }, [search, typeFilter, vehicles]);

  /**
   * Memoized sorted driver options for dropdown selects
   * 
   * Sorts drivers alphabetically by full name or username for better UX.
   */
  const driverOptions = useMemo(() => {
    return driverUsers
      .slice()
      .sort((a, b) => {
        const an = (a.fullName || a.username || '').trim();
        const bn = (b.fullName || b.username || '').trim();
        return an.localeCompare(bn);
      });
  }, [driverUsers]);

  /**
   * Handles submission of the create vehicle form
   * 
   * Validates required fields, creates the vehicle via API,
   * and updates the local state with the new vehicle.
   */
  async function submitCreate() {
    setCreateError(null);

    // Validate required license plate field
    if (!form.licensePlate.trim()) {
      setCreateError('License plate is required.');
      return;
    }

    setCreateBusy(true);
    try {
      // Prepare payload for API call
      const payload: vehiclesApi.CreateVehicleDto = {
        vehicleNumber: createVehicleId.trim(),
        trailerNumber: form.trailerNumber.trim() ? form.trailerNumber.trim() : null,
        type: form.type,
        driverId: null,  // Initially unassigned
        licensePlate: form.licensePlate.trim(),
      };

      // Create vehicle via API
      const created = await vehiclesApi.createVehicle(payload);

      // Update local state with new vehicle (add to beginning of list)
      setVehicles((prev) => [created, ...prev]);
      
      // Close modal and reset form
      setCreateOpen(false);
      setForm({ trailerNumber: '', type: 'ContainerTruck', licensePlate: '' });
    } catch (e) {
      setCreateError(prettyErrorMessage(e));
    } finally {
      setCreateBusy(false);
    }
  }

  /**
   * Opens the create vehicle modal and initializes form state
   * 
   * Generates the next vehicle ID and resets the form to default values.
   */
  function openCreate() {
    setCreateError(null);
    setCreateVehicleId(nextVehicleId(vehicles));  // Auto-generate next ID
    setForm({ trailerNumber: '', type: 'ContainerTruck', licensePlate: '' });
    setCreateOpen(true);
  }

  /**
   * Opens the edit vehicle modal and populates form with vehicle data
   * 
   * @param v - Vehicle to edit
   */
  function openEdit(v: Vehicle) {
    setRowMenuOpenForId(null);  // Close any open row menu
    setEditVehicle(v);
    setEditError(null);
    // Populate form with existing vehicle data
    setEditForm({
      trailerNumber: v.trailerNumber ?? '',
      type: (v.type as VehicleType) || 'ContainerTruck',
      licensePlate: v.licensePlate ?? '',
    });
    setEditOpen(true);
  }

  /**
   * Handles submission of the edit vehicle form
   * 
   * Validates required fields, updates the vehicle via API,
   * and updates the local state with the modified vehicle.
   */
  async function submitEdit() {
    if (!editVehicle) return;
    setEditError(null);

    // Validate required license plate field
    if (!editForm.licensePlate.trim()) {
      setEditError('License plate is required.');
      return;
    }

    setEditBusy(true);
    try {
      // Update vehicle via API
      const updated = await vehiclesApi.updateVehicle(editVehicle.id, {
        trailerNumber: editForm.trailerNumber.trim() ? editForm.trailerNumber.trim() : null,
        type: editForm.type,
        licensePlate: editForm.licensePlate.trim(),
      });
      
      // Update local state with modified vehicle
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      
      // Close modal and reset state
      setEditOpen(false);
      setEditVehicle(null);
    } catch (e) {
      setEditError(prettyErrorMessage(e));
    } finally {
      setEditBusy(false);
    }
  }

  /**
   * Opens the view vehicle details modal
   * 
   * @param v - Vehicle to view
   */
  function openView(v: Vehicle) {
    setRowMenuOpenForId(null);  // Close any open row menu
    setViewVehicle(v);
    setViewOpen(true);
  }

  /**
   * Opens the link driver modal for vehicle assignment
   * 
   * @param v - Vehicle to link driver to
   */
  function openLink(v: Vehicle) {
    setLinkVehicle(v);
    setLinkDriverUserId('');  // Reset driver selection
    setLinkError(null);
    setLinkOpen(true);
  }

  /**
   * Opens the delete vehicle confirmation modal
   * 
   * @param v - Vehicle to delete
   */
  function openDelete(v: Vehicle) {
    setRowMenuOpenForId(null);  // Close any open row menu
    setDeleteVehicle(v);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  /**
   * Handles vehicle deletion after confirmation
   * 
   * Deletes the vehicle via API and updates local state.
   */
  async function submitDelete() {
    if (!deleteVehicle) return;
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      // Delete vehicle via API
      await vehiclesApi.deleteVehicle(deleteVehicle.id);
      
      // Remove vehicle from local state
      setVehicles((prev) => prev.filter((v) => v.id !== deleteVehicle.id));
      
      // Close modal and reset state
      setDeleteOpen(false);
      setDeleteVehicle(null);
    } catch (e) {
      setDeleteError(prettyErrorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  /**
   * Handles driver assignment/unassignment to a vehicle
   * 
   * Updates the vehicle's driver assignment via API and local state.
   * Can assign a driver or remove assignment (empty selection).
   */
  async function submitLink() {
    if (!linkVehicle) return;

    setLinkError(null);
    setLinkBusy(true);
    try {
      // Update vehicle driver assignment via API
      const updated = await vehiclesApi.updateVehicleDriverUser(linkVehicle.id, {
        userId: linkDriverUserId.trim() ? linkDriverUserId.trim() : null,  // null = unassign
      });
      
      // Update local state with modified vehicle
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      
      // Close modal and reset state
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
          <div className="vehFilters" aria-label="Vehicle filters">
            <select className="vehSelect vehSelectSmall" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'All' | VehicleType)}>
              <option value="All">All Types</option>
              <option value="ContainerTruck">Container Truck</option>
              <option value="FlatbedTruck">Flatbed Truck</option>
              <option value="ReeferTruck">Reefer Truck</option>
              <option value="TankerTruck">Tanker Truck</option>
              <option value="BoxTruck">Box Truck</option>
            </select>
          </div>

          <label className="vehSearchWrap">
            <span className="vehSearchIcon" aria-hidden>
              ⌕
            </span>
            <input
              className="vehSearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Vehicle ID, license plate, driver, or trailer…"
            />
            {search ? (
              <button className="vehSearchClear" onClick={() => setSearch('')} type="button" aria-label="Clear search">
                ✕
              </button>
            ) : null}
          </label>

          <button className="vehBtn vehBtnIcon" onClick={refresh} disabled={loading} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {canManage ? (
            <button className="vehBtn vehBtnPrimary" onClick={openCreate} type="button">
              Add Vehicle
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="ymsError">{error}</div> : null}

      <DashboardCard title="Vehicle List" description={`${filtered.length} vehicles`}>
        <div className="vehTable">
          <div className="vehTableHeader vehTableCols vehTableColsVehicles">
            <div>Vehicle ID</div>
            <div>License Plate</div>
            <div>Trailer</div>
            <div>Type</div>
            <div>Status</div>
            <div>Assigned Driver</div>
            <div className="vehActionsHeader">Actions</div>
          </div>

          {filtered.map((v) => (
            <div key={v.id} className="vehTableRow vehTableCols vehTableColsVehicles" onClick={() => openView(v)} role="button" tabIndex={0}>
              <div className="vehStrong">{formatVehicleId(v.vehicleNumber)}</div>
              <div className={cellText(v.licensePlate) ? 'vehCellText' : 'vehCellMuted'}>{cellText(v.licensePlate) ? cellText(v.licensePlate) : '—'}</div>
              <div className={cellText(v.trailerNumber) ? 'vehCellText' : 'vehCellMuted'}>{cellText(v.trailerNumber) ? cellText(v.trailerNumber) : '—'}</div>
              <div className="vehTypeCell">{v.type}</div>
              <div>
                <Badge value={v.isOnHold ? `${v.status} • OnHold` : v.status} />
              </div>
              <div>
                {v.driverName ? <span className="vehDriverName">{v.driverName}</span> : <span className="vehNotAssigned">Not Assigned</span>}
              </div>
              <div className="vehRowActions">
                {canManage ? (
                  <button
                    className="vehIconBtn vehActionIcon vehActionPrimary"
                    type="button"
                    aria-label="Edit vehicle"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(v);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                ) : null}
                {canManage ? (
                  <button
                    className="vehIconBtn vehActionIcon"
                    type="button"
                    aria-label="Link driver"
                    title="Link Driver"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLink(v);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M19 8v6" />
                      <path d="M22 11h-6" />
                    </svg>
                  </button>
                ) : null}

                <div
                  className="vehMenuWrap"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <button
                    className="vehIconBtn vehMenuBtn"
                    type="button"
                    aria-label="More actions"
                    aria-haspopup="menu"
                    aria-expanded={rowMenuOpenForId === v.id}
                    onClick={(e) => {
                      const cur = rowMenuOpenForId;
                      if (cur === v.id) {
                        setRowMenuOpenForId(null);
                        setRowMenuPos(null);
                        return;
                      }

                      const btn = e.currentTarget as HTMLButtonElement;
                      const r = btn.getBoundingClientRect();
                      const menuWidth = 210;
                      const gap = 8;

                      const openUp = r.bottom + 220 > window.innerHeight;
                      const left = Math.min(Math.max(8, r.right - menuWidth), window.innerWidth - menuWidth - 8);
                      const top = openUp ? r.top - gap : r.bottom + gap;

                      setRowMenuPos({ left, top, openUp });
                      setRowMenuOpenForId(v.id);
                    }}
                  >
                    ⋯
                  </button>
                </div>
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
              <div className="vehLabel">Vehicle ID</div>
              <input className="vehInput" value={createVehicleId} disabled />
            </label>

            <label className="vehField">
              <div className="vehLabel">License Plate</div>
              <input className="vehInput" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="BA 2 KHA 1234" />
            </label>

            <label className="vehField">
              <div className="vehLabel">Trailer Number (optional)</div>
              <input className="vehInput" value={form.trailerNumber} onChange={(e) => setForm({ ...form, trailerNumber: e.target.value })} placeholder="TR-00918" />
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

      {editOpen && editVehicle ? (
        <ModalShell title={`Edit Vehicle • ${formatVehicleId(editVehicle.vehicleNumber)}`} onClose={() => setEditOpen(false)}>
          {editError ? <div className="ymsError">{editError}</div> : null}

          <div className="vehForm">
            <label className="vehField">
              <div className="vehLabel">Vehicle ID</div>
              <input className="vehInput" value={formatVehicleId(editVehicle.vehicleNumber)} disabled />
            </label>

            <label className="vehField">
              <div className="vehLabel">License Plate</div>
              <input className="vehInput" value={editForm.licensePlate} onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })} />
            </label>

            <label className="vehField">
              <div className="vehLabel">Trailer Number (optional)</div>
              <input className="vehInput" value={editForm.trailerNumber} onChange={(e) => setEditForm({ ...editForm, trailerNumber: e.target.value })} />
            </label>

            <label className="vehField">
              <div className="vehLabel">Type</div>
              <select className="vehSelect" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as VehicleType })}>
                <option value="ContainerTruck">Container Truck</option>
                <option value="FlatbedTruck">Flatbed Truck</option>
                <option value="ReeferTruck">Reefer Truck</option>
                <option value="TankerTruck">Tanker Truck</option>
                <option value="BoxTruck">Box Truck</option>
              </select>
            </label>
          </div>

          <div className="vehModalActions">
            <button className="vehBtn" onClick={() => setEditOpen(false)} type="button" disabled={editBusy}>
              Cancel
            </button>
            <button className="vehBtn vehBtnPrimary" onClick={submitEdit} type="button" disabled={editBusy}>
              {editBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {viewOpen && viewVehicle ? (
        <ModalShell title={`Vehicle Details • ${formatVehicleId(viewVehicle.vehicleNumber)}`} onClose={() => setViewOpen(false)}>
          <div className="vehViewGrid">
            <div className="vehViewField">
              <div className="vehViewLabel">Vehicle ID</div>
              <div className="vehViewValue">{formatVehicleId(viewVehicle.vehicleNumber)}</div>
            </div>
            <div className="vehViewField">
              <div className="vehViewLabel">License Plate</div>
              <div className="vehViewValue">{viewVehicle.licensePlate ?? '—'}</div>
            </div>
            <div className="vehViewField">
              <div className="vehViewLabel">Trailer Number</div>
              <div className="vehViewValue">{viewVehicle.trailerNumber ?? '—'}</div>
            </div>
            <div className="vehViewField">
              <div className="vehViewLabel">Vehicle Type</div>
              <div className="vehViewValue">{viewVehicle.type}</div>
            </div>
            <div className="vehViewField">
              <div className="vehViewLabel">Assigned Driver</div>
              <div className="vehViewValue">{viewVehicle.driverName ?? 'Not Assigned'}</div>
            </div>
            <div className="vehViewField">
              <div className="vehViewLabel">Status</div>
              <div className="vehViewValue">
                <Badge value={viewVehicle.isOnHold ? `${viewVehicle.status} • OnHold` : viewVehicle.status} />
              </div>
            </div>
          </div>

          <div className="vehModalActions">
            <button className="vehBtn vehBtnPrimary" onClick={() => setViewOpen(false)} type="button">
              Close
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
                  {u.fullName || u.username}
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

      {rowMenuOpenForId && rowMenuPos
        ? createPortal(
            <div
              className={rowMenuPos.openUp ? 'vehMenu vehMenuFixed up' : 'vehMenu vehMenuFixed'}
              role="menu"
              style={{ left: rowMenuPos.left, top: rowMenuPos.top, transform: rowMenuPos.openUp ? 'translateY(-100%)' : undefined }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {(() => {
                const v = filtered.find((x) => x.id === rowMenuOpenForId);
                if (!v) return null;
                return (
                  <>
                    <button
                      className="vehMenuItem"
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setRowMenuOpenForId(null);
                        setRowMenuPos(null);
                        openView(v);
                      }}
                    >
                      View details
                    </button>
                    {canManage ? (
                      <button
                        className="vehMenuItem danger"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setRowMenuOpenForId(null);
                          setRowMenuPos(null);
                          openDelete(v);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </>
                );
              })()}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
