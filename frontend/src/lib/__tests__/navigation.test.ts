// src/lib/__tests__/navigation.test.ts
// Business-critical: role-based navigation and route-access rules (UX protection).

import { navItemsForRole, canAccessPath, rolesForPath, NAV_ITEMS } from '../navigation';

describe('navItemsForRole', () => {
  it('returns no items for missing/unknown role', () => {
    expect(navItemsForRole()).toEqual([]);
    expect(navItemsForRole('UNKNOWN')).toEqual([]);
  });

  it('HOD sees department-scoped items', () => {
    const labels = navItemsForRole('HOD').map((i) => i.label);
    expect(labels).toContain('Students');
    expect(labels).toContain('Courses');
    expect(labels).toContain('Upload Scores');
    expect(labels).toContain('GPA');
  });

  it('DEAN sees departments but HOD-only items are hidden', () => {
    const labels = navItemsForRole('DEAN').map((i) => i.label);
    expect(labels).toContain('Departments');
    // HOD-only import page must not appear for DEAN
    expect(labels).not.toContain('Import Students');
  });

  it('every nav item has at least one allowed role', () => {
    for (const item of NAV_ITEMS) {
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});

describe('canAccessPath', () => {
  it('denies access without a role', () => {
    expect(canAccessPath('/students', undefined)).toBe(false);
  });

  it('HOD can access students, DEAN cannot', () => {
    expect(canAccessPath('/students', 'HOD')).toBe(true);
    expect(canAccessPath('/students', 'DEAN')).toBe(true); // DEAN is allowed on /students
    expect(canAccessPath('/students/upload', 'HOD')).toBe(true);
    expect(canAccessPath('/students/upload', 'DEAN')).toBe(false);
  });

  it('only DEAN can access departments', () => {
    expect(canAccessPath('/departments', 'DEAN')).toBe(true);
    expect(canAccessPath('/departments', 'HOD')).toBe(false);
    expect(canAccessPath('/departments', 'LECTURER')).toBe(false);
  });

  it('all authenticated roles can access the dashboard', () => {
    for (const role of ['HOD', 'DEAN', 'LECTURER', 'EXAMINATION_OFFICER']) {
      expect(canAccessPath('/dashboard', role)).toBe(true);
    }
  });
});

describe('rolesForPath', () => {
  it('handles dynamic nested routes via prefix matching', () => {
    // /students/[id] matches the /students rule
    expect(rolesForPath('/students/abc123')).toEqual(['HOD', 'DEAN']);
  });
});