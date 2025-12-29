import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { canSeeNavItem } from '../../auth/permissions';
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
import { AppointmentsPage } from '../Appointments/AppointmentsPage';
import { GateOperationsPage } from '../Gate/GateOperationsPage';
import { VehiclesPage } from '../Vehicles/VehiclesPage';

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

function firstAllowedRoute(role: string) {
  const first = NAV.find((i) => canSeeNavItem(role, i.to));
  return first?.to ?? '';
}

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
  const role = user?.role ?? '';
  const fallbackTo = firstAllowedRoute(role);

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
          {NAV.filter((i) => canSeeNavItem(role, i.to)).map((item) => (
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
            <Route index element={canSeeNavItem(role, '') ? <OverviewDashboard /> : <Navigate to={fallbackTo} replace />} />
            <Route
              path="yard-map"
              element={canSeeNavItem(role, 'yard-map') ? <PlaceholderPage title="Yard Map" /> : <Navigate to={fallbackTo} replace />}
            />
            <Route path="vehicles" element={canSeeNavItem(role, 'vehicles') ? <VehiclesPage /> : <Navigate to={fallbackTo} replace />} />
            <Route
              path="gate-operations"
              element={canSeeNavItem(role, 'gate-operations') ? <GateOperationsPage /> : <Navigate to={fallbackTo} replace />}
            />
            <Route
              path="dock-management"
              element={canSeeNavItem(role, 'dock-management') ? <PlaceholderPage title="Dock Management" /> : <Navigate to={fallbackTo} replace />}
            />
            <Route
              path="appointments"
              element={canSeeNavItem(role, 'appointments') ? <AppointmentsPage /> : <Navigate to={fallbackTo} replace />}
            />
            <Route path="users" element={canSeeNavItem(role, 'users') ? <UserManagementPage /> : <Navigate to={fallbackTo} replace />} />
            <Route
              path="activities"
              element={canSeeNavItem(role, 'activities') ? <PlaceholderPage title="Activities" /> : <Navigate to={fallbackTo} replace />}
            />
            <Route
              path="settings"
              element={canSeeNavItem(role, 'settings') ? <PlaceholderPage title="Settings" /> : <Navigate to={fallbackTo} replace />}
            />
            <Route path="*" element={<Navigate to={fallbackTo} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
