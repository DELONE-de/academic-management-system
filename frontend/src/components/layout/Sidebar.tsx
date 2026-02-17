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
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const hodNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/students', label: 'Students', icon: UserGroupIcon },
  { href: '/courses', label: 'Courses', icon: BookOpenIcon },
  { 
    href: '/scores', 
    label: 'Score Management', 
    icon: PencilSquareIcon,
    children: [
      { href: '/scores/entry', label: 'Manual Entry' },
      { href: '/scores/upload', label: 'Bulk Upload' },
      { href: '/scores/manage', label: 'Add/Delete Score' },
    ]
  },
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
          const hasChildren = 'children' in item && item.children;
          const isParentActive = hasChildren && (item as any).children?.some((child: any) => pathname === child.href);

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive || isParentActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>

              {/* Sub-navigation for items with children */}
              {hasChildren && (isActive || isParentActive) && (
                <div className="ml-8 mt-1 space-y-1">
                  {(item as any).children?.map((child: any) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'block px-4 py-2 text-sm rounded-lg transition-colors',
                        pathname === child.href
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
          <p className="text-sm font-medium text-white">
            {user?.role === 'HOD' ? 'Head of Department' : 'Faculty Dean'}
          </p>
          <p className="text-xs text-gray-400">
            {user?.department?.name || user?.faculty?.name}
          </p>
        </div>
      </div>
    </aside>
  );
}