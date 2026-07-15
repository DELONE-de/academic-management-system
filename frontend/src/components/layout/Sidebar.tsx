'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/students/upload', label: 'Import Students' },
  { href: '/scores/upload', label: 'Upload Scores' },
  { href: '/gpa', label: 'GPA' },
  { href: '/cgpa', label: 'CGPA' },
  { href: '/approval', label: 'Approvals' },
  { href: '/reports', label: 'Reports' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 bg-gray-900 min-h-screen flex flex-col p-4">
      <div className="mb-6">
        <p className="text-white font-bold text-lg">AcadMind</p>
        <p className="text-gray-400 text-xs mt-1">{user?.role} · {user?.firstName}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button onClick={logout}
        className="mt-4 w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
        Logout
      </button>
    </aside>
  );
}
