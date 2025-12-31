'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from './Toast';

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
