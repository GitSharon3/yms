import type { ReactNode } from 'react';

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {children}
    </svg>
  );
}

export function IconOverview() {
  return (
    <IconBase>
      <path d="M4 13h7V4H4v9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 20h7V11h-7v9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 4h7v5h-7V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 20h7v-5H4v5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </IconBase>
  );
}

export function IconMap() {
  return (
    <IconBase>
      <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 4v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 6v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

export function IconTruck() {
  return (
    <IconBase>
      <path d="M3 7h11v10H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 10h4l3 3v4h-7v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

export function IconGate() {
  return (
    <IconBase>
      <path d="M4 20V8l8-4 8 4v12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </IconBase>
  );
}

export function IconDock() {
  return (
    <IconBase>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 7v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

export function IconCalendar() {
  return (
    <IconBase>
      <path d="M7 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </IconBase>
  );
}

export function IconUsers() {
  return (
    <IconBase>
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

export function IconActivity() {
  return (
    <IconBase>
      <path d="M22 12h-4l-3 9-6-18-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </IconBase>
  );
}

export function IconSettings() {
  return (
    <IconBase>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-6l-2 .5a6 6 0 0 0-1.4-1.4l.5-2a7.9 7.9 0 0 0-6-.1l.5 2a6 6 0 0 0-1.4 1.4l-2-.5a7.9 7.9 0 0 0-.1 6l2-.5a6 6 0 0 0 1.4 1.4l-.5 2a7.9 7.9 0 0 0 6 .1l-.5-2a6 6 0 0 0 1.4-1.4l2 .5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
