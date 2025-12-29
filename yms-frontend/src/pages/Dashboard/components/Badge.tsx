const statusToClass: Record<string, string> = {
  PreArrival: 'badge neutral',
  VehicleArrival: 'badge info',
  GateCheckIn: 'badge warn',
  YardEntryAuthorization: 'badge warn',
  YardEntryLogged: 'badge info',
  ParkingAssigned: 'badge info',
  DockAssigned: 'badge info',
  TrailerMovement: 'badge warn',
  LoadUnloadInProgress: 'badge warn',
  OperationsComplete: 'badge success',
  YardExitAuthorization: 'badge info',
  ExitDocumentsProcessing: 'badge warn',
  GateCheckOut: 'badge info',
  InYard: 'badge success',
  InQueue: 'badge warn',
  AtDock: 'badge info',
  Departed: 'badge neutral',
  OnHold: 'badge danger',
  Scheduled: 'badge info',
  Confirmed: 'badge info',
  CheckedIn: 'badge warn',
  Docked: 'badge info',
  Completed: 'badge success',
  Missed: 'badge danger',
  Cancelled: 'badge neutral',
};

const statusToLabel: Record<string, string> = {
  CheckedIn: 'Checked In',
  InYard: 'In Yard',
  AtDock: 'Docked',
  Docked: 'Docked',
};

export function Badge({ value }: { value: string }) {
  const normalized = value.includes('•') ? value.split('•')[0].trim() : value.trim();
  const cls = value.includes('OnHold') ? statusToClass.OnHold : statusToClass[normalized] ?? 'badge neutral';
  const label = statusToLabel[normalized] ?? value;
  return <span className={cls}>{label}</span>;
}
