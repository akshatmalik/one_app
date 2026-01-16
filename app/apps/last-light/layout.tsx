import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Last Light - Survival Game',
  description: 'An AI-powered text adventure survival game',
};

export default function LastLightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gray-950">
      {children}
    </div>
  );
}
