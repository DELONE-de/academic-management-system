'use client';

import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user } = useAuth();
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <p className="text-sm font-medium text-gray-700">
        {user?.department?.name || user?.faculty?.name || 'Academic Management System'}
      </p>
      <p className="text-sm text-gray-500">{user?.email}</p>
    </header>
  );
}
