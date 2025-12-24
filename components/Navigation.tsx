import Link from 'next/link';
import { AuthButton } from './AuthButton';

export function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🚀 One App</h1>
        </Link>
        <AuthButton />
      </div>
    </nav>
  );
}
