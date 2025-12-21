import { DashboardCard } from './components/DashboardCard';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="ymsPage">
      <div className="ymsPageHeader">
        <div>
          <div className="ymsPageTitle">{title}</div>
          <div className="ymsPageSub">This section is ready to be implemented.</div>
        </div>
      </div>

      <DashboardCard title="Coming soon" description="Module scaffolded in navigation.">
        <div className="emptyState">No content yet.</div>
      </DashboardCard>
    </div>
  );
}
