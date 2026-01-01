'use client';

import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { useAuthContext } from '@/lib/AuthContext';

export function Navigation() {
  const { user, loading, signIn, signOut } = useAuthContext();

  return (
    <nav className="h-[60px] border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="group">
          <h1 className="text-xl font-semibold text-white/90 group-hover:text-white transition-colors">
            One App
          </h1>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="text-sm text-white/30">...</div>
          ) : user ? (
            <>
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-8 h-8 rounded-full ring-2 ring-white/10"
                />
              )}
              <button
                onClick={signOut}
                className="p-2 text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-all"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={signIn}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white/90 rounded-lg hover:bg-white/15 transition-all text-sm font-medium"
            >
              <LogIn size={16} />
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
