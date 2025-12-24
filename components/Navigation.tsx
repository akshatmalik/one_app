import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold text-gray-900">Hub App</h1>
        </Link>
      </div>
    </nav>
  );
}
