import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Game Interest Tracker',
  description: 'Track composite interest scores for upcoming game releases',
};

export default function GameInterestTrackerLayout({ children }: { children: ReactNode }) {
  return children;
}
