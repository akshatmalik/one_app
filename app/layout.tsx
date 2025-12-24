import type { Metadata } from 'next';
import { Navigation } from '@/components/Navigation';
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
      <body className="bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-8 py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
