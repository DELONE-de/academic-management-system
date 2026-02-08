// src/app/(dashboard)/dashboard/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { departmentsApi, gpaApi, reportsApi } from '@/lib/api';
import {
  UserGroupIcon,
  BookOpenIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  averageGpa: number | null;
  carryOverCount: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={cn('p-3 rounded-full', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facultyStats, setFacultyStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'HOD' && user.departmentId) {
          const [deptRes, gpaRes] = await Promise.all([
            departmentsApi.getById(user.departmentId),
            gpaApi.getDepartmentStats(user.departmentId),
          ]);

          if (deptRes.success && gpaRes.success) {
            setStats({
              totalStudents: deptRes.data._count?.students || 0,
              totalCourses: deptRes.data._count?.courses || 0,
              averageGpa: gpaRes.data.averageGpa,
              carryOverCount: gpaRes.data.distribution?.fail || 0,
            });
          }
        } else if (user?.role === 'DEAN') {
          const facultyRes = await reportsApi.getFacultyStats();
          if (facultyRes.success) {
            setFacultyStats(facultyRes.data);
            setStats({
              totalStudents: facultyRes.data.totalStudents,
              totalCourses: facultyRes.data.departments.reduce(
                (sum: number, d: any) => sum + d.courseCount,
                0
              ),
              averageGpa:
                facultyRes.data.departments.reduce(
                  (sum: number, d: any) => sum + (d.averageGpa || 0),
                  0
                ) / facultyRes.data.departments.length || null,
              carryOverCount: facultyRes.data.departments.reduce(
                (sum: number, d: any) => sum + d.carryOverCount,
                0
              ),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-500">
          {user?.role === 'HOD'
            ? `Managing ${user.department?.name} Department`
            : `Overseeing ${user?.faculty?.name}`}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          icon={UserGroupIcon}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Courses"
          value={stats?.totalCourses || 0}
          icon={BookOpenIcon}
          color="bg-green-500"
        />
        <StatCard
          title="Average GPA"
          value={stats?.averageGpa?.toFixed(2) || 'N/A'}
          icon={ChartBarIcon}
          color="bg-purple-500"
        />
        <StatCard
          title="Carry-overs"
          value={stats?.carryOverCount || 0}
          icon={ExclamationTriangleIcon}
          color="bg-orange-500"
        />
      </div>

      {/* Dean: Department Overview */}
      {user?.role === 'DEAN' && facultyStats && (
        <Card title="Department Overview" subtitle={`${facultyStats.faculty.name}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Department
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Students
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Courses
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Avg GPA
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Carry-overs
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facultyStats.departments.map((dept: any) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{dept.name}</div>
                      <div className="text-sm text-gray-500">{dept.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {dept.studentCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {dept.courseCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-sm font-medium',
                          dept.averageGpa >= 3.5
                            ? 'bg-green-100 text-green-800'
                            : dept.averageGpa >= 2.5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        )}
                      >
                        {dept.averageGpa?.toFixed(2) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {dept.carryOverCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      {user?.role === 'HOD' && (
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/students"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <UserGroupIcon className="h-8 w-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Manage Students</span>
            </a>
            <a
              href="/courses"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BookOpenIcon className="h-8 w-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Manage Courses</span>
            </a>
            <a
              href="/scores"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChartBarIcon className="h-8 w-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Enter Scores</span>
            </a>
            <a
              href="/reports"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ExclamationTriangleIcon className="h-8 w-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">View Reports</span>
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}