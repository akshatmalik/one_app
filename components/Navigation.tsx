'use client';

import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { useAuthContext } from '@/lib/AuthContext';

export function Navigation() {
  const { user, loading, signIn, signOut } = useAuthContext();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold text-gray-900">One App</h1>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : user ? (
            <>
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user.email}
              </span>
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <button
                onClick={signOut}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Sign out"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={signIn}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <LogIn size={18} />
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
