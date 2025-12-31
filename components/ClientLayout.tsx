'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/AuthContext';

export function ClientLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
