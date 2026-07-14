// FILE: frontend/src/components/layout/Sidebar.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  HomeIcon,
  UserGroupIcon,
  BookOpenIcon,
  PencilSquareIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  AcademicCapIcon,
  CloudArrowUpIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const hodNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/students', label: 'Students', icon: UserGroupIcon },
  { href: '/courses', label: 'Courses', icon: BookOpenIcon },
  { href: '/scores/upload', label: 'Upload Scores', icon: CloudArrowUpIcon },
  { href: '/approval', label: 'Approvals', icon: CheckBadgeIcon },
  { href: '/gpa', label: 'GPA View', icon: ChartBarIcon },
  { href: '/cgpa', label: 'CGPA View', icon: AcademicCapIcon },
  { href: '/reports', label: 'Reports', icon: DocumentChartBarIcon },
];

const deanNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/departments', label: 'Departments', icon: BookOpenIcon },
  { href: '/approval', label: 'Approvals', icon: CheckBadgeIcon },
  { href: '/gpa', label: 'GPA Statistics', icon: ChartBarIcon },
  { href: '/reports', label: 'Reports', icon: DocumentChartBarIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = user?.role === 'HOD' ? hodNavItems : deanNavItems;

  return (
    <aside className="w-64 bg-gray-900 min-h-screen p-4 flex flex-col relative">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <AcademicCapIcon className="h-8 w-8 text-primary-400" />
          <span className="text-xl font-bold text-white">GPA System</span>
        </Link>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Quick Actions */}
      {user?.role === 'HOD' && (
        <div className="mt-8 pt-8 border-t border-gray-700">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase mb-3">
            Quick Actions
          </p>
          <div className="space-y-1">
            <Link
              href="/students/upload"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              Import Students
            </Link>
            <Link
              href="/scores/upload"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              Import Scores
            </Link>
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="mt-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="text-sm font-medium text-white capitalize">
            {user?.role?.replace('_', ' ').toLowerCase()}
          </p>
          <p className="text-xs text-gray-400">
            {user?.department?.name || user?.faculty?.name || ''}
          </p>
        </div>
      </div>
    </aside>
  );
}