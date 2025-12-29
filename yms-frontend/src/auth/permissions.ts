import type { UserRole } from '../api/users';

export type GatePermission =
  | 'gate.view'
  | 'gate.check_in'
  | 'gate.check_out'
  | 'gate.move_to_dock'
  | 'gate.security_event'
  | 'gate.audit_view';

export type VehiclePermission =
  | 'vehicles.view'
  | 'vehicles.assign'
  | 'vehicles.hold'
  | 'vehicles.location_update'
  | 'vehicles.status_update'
  | 'vehicles.audit_view';

function normalizeUserRole(role: string | undefined | null): UserRole | null {
  const raw = (role ?? '').trim();
  if (!raw) return null;

  const key = raw.replace(/[\s_-]+/g, '').toLowerCase();
  if (key === 'admin') return 'Admin';
  if (key === 'yardmanager') return 'YardManager';
  if (key === 'yardjockey') return 'YardJockey';
  if (key === 'operator') return 'Operator';
  if (key === 'gatesecurity') return 'GateSecurity';
  if (key === 'driver') return 'Driver';
  if (key === 'viewonly') return 'ViewOnly';
  return null;
}

const rolePerms: Record<UserRole, Set<GatePermission>> = {
  Admin: new Set(['gate.view', 'gate.check_in', 'gate.check_out', 'gate.move_to_dock', 'gate.security_event', 'gate.audit_view']),
  YardManager: new Set(['gate.view', 'gate.check_in', 'gate.check_out', 'gate.move_to_dock', 'gate.audit_view']),
  YardJockey: new Set(['gate.view', 'gate.move_to_dock']),
  Operator: new Set(['gate.view', 'gate.move_to_dock']),
  GateSecurity: new Set(['gate.view', 'gate.check_in', 'gate.check_out', 'gate.security_event']),
  Driver: new Set(['gate.view', 'gate.check_in', 'gate.check_out']),
  ViewOnly: new Set(['gate.view']),
};

const vehicleRolePerms: Record<UserRole, Set<VehiclePermission>> = {
  Admin: new Set([
    'vehicles.view',
    'vehicles.assign',
    'vehicles.hold',
    'vehicles.location_update',
    'vehicles.status_update',
    'vehicles.audit_view',
  ]),
  YardManager: new Set(['vehicles.view', 'vehicles.assign', 'vehicles.hold', 'vehicles.location_update', 'vehicles.status_update', 'vehicles.audit_view']),
  YardJockey: new Set(['vehicles.view', 'vehicles.status_update']),
  Operator: new Set(['vehicles.view', 'vehicles.status_update']),
  GateSecurity: new Set(['vehicles.view']),
  Driver: new Set(['vehicles.view', 'vehicles.audit_view']),
  ViewOnly: new Set(['vehicles.view']),
};

export function hasGatePermission(role: string | undefined | null, perm: GatePermission): boolean {
  const key = normalizeUserRole(role);
  if (!key) return false;
  return rolePerms[key].has(perm);
}

export function hasVehiclePermission(role: string | undefined | null, perm: VehiclePermission): boolean {
  const key = normalizeUserRole(role);
  if (!key) return false;
  return vehicleRolePerms[key].has(perm);
}

export function canSeeNavItem(role: string | undefined | null, to: string): boolean {
  const r = normalizeUserRole(role);
  if (!r) return false;

  if (r === 'Admin') return true;

  if (r === 'YardManager') {
    return to !== 'users';
  }

  if (to === '') {
    return false;
  }

  if (to === 'yard-map') {
    return r === 'Operator' || r === 'YardJockey' || r === 'ViewOnly';
  }

  if (to === 'vehicles') {
    return hasVehiclePermission(r, 'vehicles.view');
  }

  if (to === 'gate-operations') {
    return hasGatePermission(r, 'gate.view');
  }

  if (to === 'dock-management') {
    return r === 'Operator' || r === 'YardJockey' || r === 'ViewOnly';
  }

  if (to === 'appointments') {
    return r === 'Operator' || r === 'YardJockey' || r === 'GateSecurity' || r === 'Driver' || r === 'ViewOnly';
  }

  if (to === 'activities') {
    return r === 'GateSecurity' || r === 'ViewOnly';
  }

  if (to === 'settings') {
    return false;
  }

  if (to === 'users') {
    return false;
  }

  return false;
}
