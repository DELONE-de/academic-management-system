// src/components/layout/Header.tsx

'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            GPA Management System
          </h1>
          <p className="text-sm text-gray-500">
            {user?.role === 'HOD' ? 'Head of Department' : 'Faculty Dean'} Dashboard
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">
                {user?.department?.name || user?.faculty?.name}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}