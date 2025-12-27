import type { UserRole } from '../api/users';

export type GatePermission =
  | 'gate.view'
  | 'gate.check_in'
  | 'gate.check_out'
  | 'gate.move_to_dock'
  | 'gate.security_event'
  | 'gate.audit_view';

const rolePerms: Record<UserRole, Set<GatePermission>> = {
  Admin: new Set(['gate.view', 'gate.check_in', 'gate.check_out', 'gate.move_to_dock', 'gate.security_event', 'gate.audit_view']),
  YardManager: new Set(['gate.view', 'gate.check_in', 'gate.check_out', 'gate.move_to_dock', 'gate.audit_view']),
  YardJockey: new Set(['gate.view', 'gate.move_to_dock']),
  Operator: new Set(['gate.view', 'gate.move_to_dock']),
  GateSecurity: new Set(['gate.view', 'gate.check_in', 'gate.check_out', 'gate.security_event']),
  Driver: new Set(['gate.view', 'gate.check_in', 'gate.check_out']),
  ViewOnly: new Set(['gate.view']),
};

export function hasGatePermission(role: string | undefined | null, perm: GatePermission): boolean {
  const key = role as UserRole | undefined;
  if (!key || !(key in rolePerms)) return false;
  return rolePerms[key].has(perm);
}

export function canSeeNavItem(role: string | undefined | null, to: string): boolean {
  if (to === 'gate-operations') return hasGatePermission(role, 'gate.view');
  if (to === 'users') return role === 'Admin';
  return true;
}
