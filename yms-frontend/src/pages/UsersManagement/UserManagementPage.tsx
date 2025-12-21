import { useEffect, useMemo, useState } from 'react';

import * as usersApi from '../../api/users';
import { DashboardCard } from '../Dashboard/components/DashboardCard';
import './UserManagementPage.css';

type ModalMode = 'none' | 'view' | 'create' | 'edit' | 'status';

type StatusTarget = {
  user: usersApi.UserDto;
  nextActive: boolean;
} | null;

const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Yard Manager', value: 'Yard Manager' },
  { label: 'Driver', value: 'Driver' },
  { label: 'View Only', value: 'ViewOnly' },
];

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function roleBadgeClass(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('admin')) return 'badge danger';
  if (r.includes('yard')) return 'badge info';
  if (r.includes('driver')) return 'badge warn';
  return 'badge neutral';
}

function roleLabel(role: string): string {
  if (!role) return '—';
  if (role.toLowerCase() === 'viewonly') return 'View Only';
  return role;
}

function statusBadgeClass(isActive: boolean): string {
  return isActive ? 'badge success' : 'badge danger';
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="umModalOverlay" role="dialog" aria-modal="true">
      <div className="umModal">
        <div className="umModalHeader">
          <div className="umModalTitle">{title}</div>
          <button className="umIconBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="umModalBody">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmText,
  danger,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  message: string;
  confirmText: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <div className="umConfirmText">{message}</div>
      <div className="umModalActions">
        <button className="umBtn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className={danger ? 'umBtn umBtnDanger' : 'umBtn umBtnPrimary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Saving…' : confirmText}
        </button>
      </div>
    </ModalShell>
  );
}

function UserViewModal({ user, onClose }: { user: usersApi.UserDto; onClose: () => void }) {
  return (
    <ModalShell title="View User" onClose={onClose}>
      <div className="umFormGrid">
        <div className="umField">
          <div className="umLabel">ID</div>
          <div className="umValue">{user.id}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Full Name</div>
          <div className="umValue">{user.fullName}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Email</div>
          <div className="umValue">{user.email}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Phone</div>
          <div className="umValue">{user.phone}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Username</div>
          <div className="umValue">{user.username}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Role</div>
          <div className="umValue">{roleLabel(user.role)}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Status</div>
          <div className="umValue">{user.isActive ? 'Active' : 'Inactive'}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Last Login</div>
          <div className="umValue">{formatDateTime(user.lastLogin)}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Created</div>
          <div className="umValue">{formatDateTime(user.createdAt)}</div>
        </div>
        <div className="umField">
          <div className="umLabel">Updated</div>
          <div className="umValue">{formatDateTime(user.updatedAt)}</div>
        </div>
      </div>

      <div className="umModalActions">
        <button className="umBtn umBtnPrimary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalShell>
  );
}

function UserFormModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial: usersApi.UserDto | null;
  onClose: () => void;
  onSaved: (user: usersApi.UserDto) => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [role, setRole] = useState(initial?.role ?? 'ViewOnly');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = mode === 'create' ? 'Add New User' : 'Edit User';

  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    username.trim() &&
    phone.trim() &&
    role.trim() &&
    (mode === 'edit' ? true : password.length >= 8);

  async function submit() {
    setError(null);
    setBusy(true);

    try {
      if (mode === 'create') {
        const created = await usersApi.createUser({
          fullName: fullName.trim(),
          email: email.trim(),
          username: username.trim(),
          phone: phone.trim(),
          role: role.trim(),
          password,
        });
        onSaved(created);
        return;
      }

      if (!initial) {
        throw new Error('Missing user');
      }

      const payload: usersApi.UpdateUserDto = {
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        phone: phone.trim(),
        role: role.trim(),
      };

      if (password.trim()) {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        payload.password = password;
      }

      const updated = await usersApi.updateUser(initial.id, payload);
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="umFormGrid">
        <label className="umField">
          <div className="umLabel">Full Name</div>
          <input className="umInput" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
        </label>

        <label className="umField">
          <div className="umLabel">Email</div>
          <input
            className="umInput"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john.doe@example.com"
          />
        </label>

        <label className="umField">
          <div className="umLabel">Phone</div>
          <input className="umInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
        </label>

        <label className="umField">
          <div className="umLabel">Username</div>
          <input className="umInput" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="john.doe" />
        </label>

        <label className="umField">
          <div className="umLabel">Role</div>
          <select className="umSelect" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="umField">
          <div className="umLabel">Password {mode === 'edit' ? '(optional)' : ''}</div>
          <input
            className="umInput"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'edit' ? 'Leave blank to keep unchanged' : 'Minimum 8 characters'}
          />
        </label>
      </div>

      {error && <div className="ymsError">{error}</div>}

      <div className="umModalActions">
        <button className="umBtn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="umBtn umBtnPrimary" onClick={submit} disabled={!canSubmit || busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </ModalShell>
  );
}

export function UserManagementPage() {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<string>('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<usersApi.PagedResult<usersApi.UserDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalMode>('none');
  const [selected, setSelected] = useState<usersApi.UserDto | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const isActiveFilter = useMemo(() => {
    if (status === 'active') return true;
    if (status === 'inactive') return false;
    return null;
  }, [status]);

  const totalPages = data?.totalPages ?? 1;

  function closeModal() {
    setModal('none');
    setSelected(null);
    setStatusTarget(null);
  }

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const res = await usersApi.getUsers({
        page,
        pageSize,
        search: query,
        role: role || undefined,
        isActive: isActiveFilter,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [page, pageSize, role, isActiveFilter]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      void refresh();
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  function openCreate() {
    setSelected(null);
    setModal('create');
  }

  function openView(user: usersApi.UserDto) {
    setSelected(user);
    setModal('view');
  }

  function openEdit(user: usersApi.UserDto) {
    setSelected(user);
    setModal('edit');
  }

  function openStatus(user: usersApi.UserDto) {
    setStatusTarget({ user, nextActive: !user.isActive });
    setModal('status');
  }

  function onSaved() {
    closeModal();
    void refresh();
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setStatusBusy(true);

    try {
      await usersApi.updateUserStatus(statusTarget.user.id, statusTarget.nextActive);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
      closeModal();
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div className="ymsPage">
      <div className="ymsPageHeader">
        <div>
          <div className="ymsPageTitle">User Management</div>
          <div className="ymsPageSub">Create, view, edit, and activate/deactivate user accounts (soft delete).</div>
        </div>

        <div className="umHeaderActions">
          <button className="umBtn umBtnPrimary" onClick={openCreate}>
            + Add User
          </button>
        </div>
      </div>

      <DashboardCard title="Users" description="Search, filter by role/status, and manage accounts.">
        <div className="umToolbar">
          <input
            className="umSearch"
            placeholder="Search by name, email, username, phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="umSelectInline"
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            className="umSelectInline"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as 'all' | 'active' | 'inactive');
            }}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="umSelectInline"
            value={String(pageSize)}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            aria-label="Page size"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={String(n)}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {error && <div className="ymsError">{error}</div>}

        {loading ? (
          <div className="ymsLoading">Loading users…</div>
        ) : (
          <div className="umTableWrap">
            <div className="umTableHeader">
              <div>ID</div>
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Phone</div>
              <div>Status</div>
              <div>Last Login</div>
              <div className="umActionsHead">Actions</div>
            </div>

            {(data?.items?.length ?? 0) === 0 ? (
              <div className="tableEmpty">No users found.</div>
            ) : (
              data!.items.map((u) => (
                <div className="umTableRow" key={u.id}>
                  <div className="cellStrong umMono">{u.id.slice(0, 8)}</div>
                  <div>
                    <div className="cellStrong">{u.fullName}</div>
                    <div className="umSub">@{u.username}</div>
                  </div>
                  <div className="umEllipsis" title={u.email}>
                    {u.email}
                  </div>
                  <div>
                    <span className={roleBadgeClass(u.role)}>{roleLabel(u.role)}</span>
                  </div>
                  <div className="umEllipsis" title={u.phone}>
                    {u.phone}
                  </div>
                  <div>
                    <span className={statusBadgeClass(u.isActive)}>{u.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div>{formatDateTime(u.lastLogin)}</div>
                  <div className="umActions">
                    <button className="umLinkBtn" onClick={() => openView(u)}>
                      View
                    </button>
                    <button className="umLinkBtn" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                    <button className={u.isActive ? 'umLinkBtn danger' : 'umLinkBtn'} onClick={() => openStatus(u)}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="umPager">
          <div className="umPagerMeta">
            {data ? (
              <>
                Total: <span className="cellStrong">{data.totalCount}</span>
              </>
            ) : (
              <>Total: —</>
            )}
          </div>

          <div className="umPagerControls">
            <button className="umBtn" onClick={() => setPage(1)} disabled={page <= 1}>
              First
            </button>
            <button className="umBtn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </button>
            <div className="umPagerPage">
              Page <span className="cellStrong">{page}</span> of <span className="cellStrong">{totalPages}</span>
            </div>
            <button className="umBtn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </button>
            <button className="umBtn" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
              Last
            </button>
          </div>
        </div>
      </DashboardCard>

      {modal === 'view' && selected && <UserViewModal user={selected} onClose={closeModal} />}
      {modal === 'create' && <UserFormModal mode="create" initial={null} onClose={closeModal} onSaved={onSaved} />}
      {modal === 'edit' && selected && <UserFormModal mode="edit" initial={selected} onClose={closeModal} onSaved={onSaved} />}
      {modal === 'status' && statusTarget && (
        <ConfirmModal
          title={statusTarget.nextActive ? 'Activate user?' : 'Deactivate user?'}
          message={
            statusTarget.nextActive
              ? `This will activate ${statusTarget.user.fullName}.`
              : `This will deactivate ${statusTarget.user.fullName}. The user will remain in the system (soft delete).`
          }
          confirmText={statusTarget.nextActive ? 'Activate' : 'Deactivate'}
          danger={!statusTarget.nextActive}
          onCancel={closeModal}
          onConfirm={confirmStatusChange}
          busy={statusBusy}
        />
      )}
    </div>
  );
}
