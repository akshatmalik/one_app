import type { Metadata } from 'next';
import { Navigation } from '@/components/Navigation';
import { ClientLayout } from '@/components/ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'One App - Your Personal Hub',
  description: 'Your personal mini-application dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] min-h-screen">
        <ClientLayout>
          <Navigation />
          <main className="min-h-[calc(100vh-60px)]">
            {children}
          </main>
        </ClientLayout>
      </body>
    </html>
  );
}
