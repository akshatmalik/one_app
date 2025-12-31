import { HubGrid } from '@/components/HubGrid';
import { MINI_APPS } from '@/lib/mini-apps';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            Your Apps
          </h1>
          <p className="text-white/40 text-lg">Select an app to get started</p>
        </div>
        <HubGrid apps={MINI_APPS} />
      </div>
    </div>
  );
}
