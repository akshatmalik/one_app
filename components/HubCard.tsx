import Link from 'next/link';
import { Card } from './ui/Card';
import { MiniApp } from '@/types/mini-app';

interface HubCardProps {
  app: MiniApp;
}

export function HubCard({ app }: HubCardProps) {
  if (app.isComingSoon) {
    return (
      <Card className="p-6 opacity-50 cursor-not-allowed">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{app.icon}</div>
          <span className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            Coming Soon
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{app.name}</h3>
        <p className="text-sm text-gray-600">{app.description}</p>
      </Card>
    );
  }

  return (
    <Link href={app.path}>
      <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{app.icon}</div>
          {app.isNew && (
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded">
              New
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{app.name}</h3>
        <p className="text-sm text-gray-600">{app.description}</p>
      </Card>
    </Link>
  );
}
