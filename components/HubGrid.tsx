import { HubCard } from './HubCard';
import { MiniApp } from '@/types/mini-app';

interface HubGridProps {
  apps: MiniApp[];
}

export function HubGrid({ apps }: HubGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {apps.map(app => (
        <HubCard key={app.id} app={app} />
      ))}
    </div>
  );
}
