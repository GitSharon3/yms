import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { OverviewDashboard } from './OverviewDashboard';
import { PlaceholderPage } from './PlaceholderPage';
import {
  IconActivity,
  IconCalendar,
  IconDock,
  IconGate,
  IconMap,
  IconOverview,
  IconSettings,
  IconTruck,
  IconUsers,
} from './components/Icons';

import { UserManagementPage } from '../UsersManagement/UserManagementPage';

import './AdminDashboard.css';

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

const NAV: NavItem[] = [
  { to: '', label: 'Overview', icon: <IconOverview /> },
  { to: 'yard-map', label: 'Yard Map', icon: <IconMap /> },
  { to: 'vehicles', label: 'Vehicles', icon: <IconTruck /> },
  { to: 'gate-operations', label: 'Gate Operations', icon: <IconGate /> },
  { to: 'dock-management', label: 'Dock Management', icon: <IconDock /> },
  { to: 'appointments', label: 'Appointments', icon: <IconCalendar /> },
  { to: 'users', label: 'User Management', icon: <IconUsers /> },
  { to: 'activities', label: 'Activities', icon: <IconActivity /> },
  { to: 'settings', label: 'Settings', icon: <IconSettings /> },
];

function initials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const first = parts[0]?.[0] ?? 'U';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + last).toUpperCase();
}

export default function AdminDashboard() {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '(same origin)';
  const { user, logout } = useAuth();

  return (
    <div className="ymsShell">
      <aside className="ymsSidebar">
        <div className="ymsBrand">
          <div className="ymsBrandMark">Y</div>
          <div>
            <div className="ymsBrandTitle">YardManagement</div>
            <div className="ymsBrandSub">System</div>
          </div>
        </div>

        <nav className="ymsNav">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === ''}
              className={({ isActive }) => (isActive ? 'ymsNavItem active' : 'ymsNavItem')}
            >
              <span className="ymsNavIcon" aria-hidden>
                {item.icon}
              </span>
              <span className="ymsNavLabel">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ymsSidebarFooter">
          <div className="ymsSidebarHint">Backend: {apiBase}</div>
        </div>
      </aside>

      <div className="ymsMain">
        <header className="ymsTopbar">
          <div className="ymsTopbarLeft">
            <div className="ymsTopbarTitle">Yard Management System</div>
          </div>

          <div className="ymsTopbarRight">
            <div className="ymsUser">
              <div className="ymsUserAvatar" aria-hidden>
                {initials(user?.username ?? 'User')}
              </div>
              <div className="ymsUserMeta">
                <div className="ymsUserName">{user?.username ?? 'User'}</div>
                <div className="ymsUserRole">{user?.role ?? ''}</div>
              </div>
            </div>
            <button className="ymsLogout" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="ymsContent">
          <Routes>
            <Route index element={<OverviewDashboard />} />
            <Route path="yard-map" element={<PlaceholderPage title="Yard Map" />} />
            <Route path="vehicles" element={<PlaceholderPage title="Vehicles" />} />
            <Route path="gate-operations" element={<PlaceholderPage title="Gate Operations" />} />
            <Route path="dock-management" element={<PlaceholderPage title="Dock Management" />} />
            <Route path="appointments" element={<PlaceholderPage title="Appointments" />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="activities" element={<PlaceholderPage title="Activities" />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
