'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { navItemsForRole } from '@/lib/navigation';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = navItemsForRole(user?.role);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const nav = (
    <nav className="flex-1 space-y-1" aria-label="Main navigation">
      {navItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive(item.href)
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
          aria-current={isActive(item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-gray-900 min-h-screen flex-col p-4">
        <div className="mb-6">
          <p className="text-white font-bold text-lg">AcadMind</p>
          <p className="text-gray-400 text-xs mt-1">{user?.role} · {user?.firstName}</p>
        </div>
        {nav}
        <button
          onClick={logout}
          className="mt-4 w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
        >
          Logout
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-gray-900 min-h-screen flex flex-col p-4 z-50">
            <div className="mb-6">
              <p className="text-white font-bold text-lg">AcadMind</p>
              <p className="text-gray-400 text-xs mt-1">{user?.role} · {user?.firstName}</p>
            </div>
            {nav}
            <button
              onClick={logout}
              className="mt-4 w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            >
              Logout
            </button>
          </aside>
        </div>
      )}
    </>
  );
}