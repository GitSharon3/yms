import type { ReactNode } from 'react';

export function DashboardCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dashCard">
      <div className="dashCardHeader">
        <div>
          <div className="dashCardTitle">{title}</div>
          {description ? <div className="dashCardDesc">{description}</div> : null}
        </div>
        {actions ? <div className="dashCardActions">{actions}</div> : null}
      </div>
      <div className="dashCardBody">{children}</div>
    </section>
  );
}
