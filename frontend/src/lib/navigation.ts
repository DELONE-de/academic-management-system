// FILE: frontend/src/lib/navigation.ts
// Role-aware navigation configuration — single source of truth for nav + route protection.

import { UserRole } from '@/types';

export interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['HOD', 'DEAN', 'LECTURER', 'EXAMINATION_OFFICER'] },
  { href: '/students', label: 'Students', roles: ['HOD', 'DEAN'] },
  { href: '/students/upload', label: 'Import Students', roles: ['HOD'] },
  { href: '/courses', label: 'Courses', roles: ['HOD', 'DEAN'] },
  { href: '/scores/upload', label: 'Upload Scores', roles: ['HOD', 'DEAN', 'LECTURER', 'EXAMINATION_OFFICER'] },
  { href: '/gpa', label: 'GPA', roles: ['HOD', 'DEAN'] },
  { href: '/cgpa', label: 'CGPA', roles: ['HOD', 'DEAN'] },
  { href: '/approval', label: 'Approvals', roles: ['HOD', 'DEAN', 'LECTURER', 'EXAMINATION_OFFICER'] },
  { href: '/reports', label: 'Reports', roles: ['HOD', 'DEAN', 'EXAMINATION_OFFICER'] },
  { href: '/departments', label: 'Departments', roles: ['DEAN'] },
];

export function navItemsForRole(role?: UserRole | string): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role as UserRole));
}

// Route access rules for protected pages. These are UX-only guards —
// backend authorization remains authoritative.
export const ROUTE_RULES: Record<string, UserRole[]> = {
  '/students': ['HOD', 'DEAN'],
  '/students/upload': ['HOD'],
  '/students/new': ['HOD'],
  '/courses': ['HOD', 'DEAN'],
  '/scores': ['HOD', 'DEAN', 'LECTURER', 'EXAMINATION_OFFICER'],
  '/scores/upload': ['HOD', 'DEAN', 'LECTURER', 'EXAMINATION_OFFICER'],
  '/gpa': ['HOD', 'DEAN'],
  '/cgpa': ['HOD', 'DEAN'],
  '/approval': ['HOD', 'DEAN', 'LECTURER', 'EXAMINATION_OFFICER'],
  '/reports': ['HOD', 'DEAN', 'EXAMINATION_OFFICER'],
  '/departments': ['DEAN'],
};

/**
 * Returns the roles allowed for a given path (with dynamic segments handled).
 */
export function rolesForPath(pathname: string): UserRole[] | undefined {
  // Exact match
  if (ROUTE_RULES[pathname]) return ROUTE_RULES[pathname];

  // Prefix match for nested routes (e.g. /students/[id])
  const segments = pathname.split('/').filter(Boolean);
  // Try progressively shorter prefixes
  for (let i = segments.length - 1; i >= 0; i--) {
    const prefix = '/' + segments.slice(0, i + 1).join('/');
    if (ROUTE_RULES[prefix]) return ROUTE_RULES[prefix];
  }
  return undefined;
}

export function canAccessPath(pathname: string, role?: UserRole | string): boolean {
  if (!role) return false;
  const allowed = rolesForPath(pathname);
  // No rule = allowed for any authenticated user
  if (!allowed) return true;
  return allowed.includes(role as UserRole);
}
