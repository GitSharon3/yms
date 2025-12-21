const statusToClass: Record<string, string> = {
  InYard: 'badge success',
  InQueue: 'badge warn',
  AtDock: 'badge info',
  Departed: 'badge neutral',
  Scheduled: 'badge info',
  CheckedIn: 'badge warn',
  Completed: 'badge success',
  Missed: 'badge danger',
  Cancelled: 'badge neutral',
};

export function Badge({ value }: { value: string }) {
  const cls = statusToClass[value] ?? 'badge neutral';
  return <span className={cls}>{value}</span>;
}
