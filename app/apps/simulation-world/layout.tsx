import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Simulation World — OneApp',
  description: 'An autonomous medieval township economy you can observe and govern.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17130d',
};

export default function SimulationWorldLayout({ children }: { children: React.ReactNode }) {
  return children;
}
