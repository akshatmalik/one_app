import Link from 'next/link';
import { MiniApp } from '@/types/mini-app';
import { ArrowRight } from 'lucide-react';

interface HubCardProps {
  app: MiniApp;
}

export function HubCard({ app }: HubCardProps) {
  if (app.isComingSoon) {
    return (
      <div className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{app.icon}</div>
          <span className="text-[10px] font-medium px-2 py-1 bg-white/10 text-white/50 rounded-full uppercase tracking-wider">
            Soon
          </span>
        </div>
        <h3 className="text-lg font-semibold text-white/80 mb-2">{app.name}</h3>
        <p className="text-sm text-white/30">{app.description}</p>
      </div>
    );
  }

  return (
    <Link href={app.path} className="group">
      <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 cursor-pointer overflow-hidden">
        {/* Subtle gradient overlay on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${app.color}15 0%, transparent 50%)`
          }}
        />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">{app.icon}</div>
            {app.isNew && (
              <span className="text-[10px] font-medium px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full uppercase tracking-wider">
                New
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white/90 mb-2 group-hover:text-white transition-colors">{app.name}</h3>
          <p className="text-sm text-white/40 mb-4 group-hover:text-white/50 transition-colors">{app.description}</p>

          <div className="flex items-center text-white/30 group-hover:text-white/60 transition-colors">
            <span className="text-xs font-medium">Open App</span>
            <ArrowRight size={14} className="ml-1 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
