import { HubGrid } from '@/components/HubGrid';
import { MINI_APPS } from '@/lib/mini-apps';

export default function HomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">My App Hub</h1>
      <p className="text-gray-600 mb-8">Welcome to your personal mini-application dashboard</p>
      <HubGrid apps={MINI_APPS} />
    </div>
  );
}
