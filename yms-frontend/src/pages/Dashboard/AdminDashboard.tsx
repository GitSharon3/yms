import { useEffect, useMemo, useState } from 'react';

import { createYard, getYards, type Yard } from '../../api/yards';
import { useAuth } from '../../auth/AuthContext';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL as string | undefined, []);
  const { admin, logout } = useAuth();

  const [yards, setYards] = useState<Yard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await getYards();
      setYards(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load yards');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate() {
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await createYard({ name: name.trim(), address: address.trim() ? address.trim() : null });
      setName('');
      setAddress('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create yard');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adminShell">
      <header className="adminTopbar">
        <div>
          <div className="adminTitle">Admin Dashboard</div>
          <div className="adminSubtitle">
            Signed in as <span className="strong">{admin?.username}</span> ({admin?.email}) • Backend: {apiBase ?? '(same origin)'}
          </div>
        </div>
        <button className="btn" onClick={logout}>
          Logout
        </button>
      </header>

      <main className="adminContent">
        <section className="panel">
          <h2 className="panelTitle">Create Yard</h2>
          <div className="formRow">
            <label className="label">
              Name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="label">
              Address
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <button className="btn primary" disabled={saving || !name.trim()} onClick={() => void onCreate()}>
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2 className="panelTitle">Yards</h2>
            <button className="btn" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </button>
          </div>

          {error && <div className="error">{error}</div>}
          {loading ? (
            <div className="muted">Loading…</div>
          ) : yards.length === 0 ? (
            <div className="muted">No yards yet.</div>
          ) : (
            <div className="table">
              <div className="row head">
                <div>Name</div>
                <div>Address</div>
                <div>Created</div>
              </div>
              {yards.map((y) => (
                <div className="row" key={y.id}>
                  <div className="cell strong">{y.name}</div>
                  <div className="cell">{y.address ?? '-'}</div>
                  <div className="cell muted">{new Date(y.createdAtUtc).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
