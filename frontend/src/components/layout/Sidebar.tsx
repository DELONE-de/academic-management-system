// src/components/layout/Sidebar.tsx

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
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const hodNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/students', label: 'Students', icon: UserGroupIcon },
  { href: '/courses', label: 'Courses', icon: BookOpenIcon },
  { href: '/scores', label: 'Score Entry', icon: PencilSquareIcon },
  { href: '/gpa', label: 'GPA View', icon: ChartBarIcon },
  { href: '/cgpa', label: 'CGPA View', icon: AcademicCapIcon },
  { href: '/reports', label: 'Reports', icon: DocumentChartBarIcon },
];

const deanNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/departments', label: 'Departments', icon: BookOpenIcon },
  { href: '/gpa', label: 'GPA Statistics', icon: ChartBarIcon },
  { href: '/reports', label: 'Reports', icon: DocumentChartBarIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = user?.role === 'HOD' ? hodNavItems : deanNavItems;

  return (
    <aside className="w-64 bg-gray-900 min-h-screen p-4">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <AcademicCapIcon className="h-8 w-8 text-primary-400" />
          <span className="text-xl font-bold text-white">GPA System</span>
        </Link>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
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

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="text-sm font-medium text-white">
            {user?.role === 'HOD' ? 'Head of Department' : 'Faculty Dean'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {user?.department?.name || user?.faculty?.name}
          </p>
        </div>
      </div>
    </aside>
  );
}