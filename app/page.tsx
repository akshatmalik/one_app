import { HubGrid } from '@/components/HubGrid';
import { MINI_APPS } from '@/lib/mini-apps';

export default function HomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Apps</h1>
      <p className="text-gray-600 mb-8">Access all your personal mini-applications</p>
      <HubGrid apps={MINI_APPS} />
    </div>
  );
}
