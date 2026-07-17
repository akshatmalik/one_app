import type { Viewport } from 'next';

export const metadata = {
  title: 'Farm Sim',
  description: 'Real-time pixel-art farming game',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#101713',
};

// Farm Sim is full-screen — override the root layout's main padding/min-height
// by wrapping in a div that escapes to fill the viewport.
export default function FarmSimLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {children}
    </div>
  );
}
