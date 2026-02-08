// src/app/(dashboard)/departments/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { reportsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BuildingLibraryIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DepartmentStat {
  id: string;
  name: string;
  code: string;
  studentCount: number;
  courseCount: number;
  averageGpa: number | null;
  highestGpa: number | null;
  lowestGpa: number | null;
  carryOverCount: number;
}

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [facultyStats, setFacultyStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.role !== 'DEAN') return;

      try {
        const response = await reportsApi.getFacultyStats();
        if (response.success) {
          setFacultyStats(response.data);
        }
      } catch (error) {
        toast.error('Failed to fetch faculty statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (user?.role !== 'DEAN') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Only Deans can view this page.</p>
      </div>
    );
  }

  const columns = [
    {
      key: 'name',
      header: 'Department',
      render: (dept: DepartmentStat) => (
        <div>
          <p className="font-medium text-gray-900">{dept.name}</p>
          <p className="text-sm text-gray-500">{dept.code}</p>
        </div>
      ),
    },
    {
      key: 'studentCount',
      header: 'Students',
      className: 'text-center',
    },
    {
      key: 'courseCount',
      header: 'Courses',
      className: 'text-center',
    },
    {
      key: 'averageGpa',
      header: 'Avg GPA',
      render: (dept: DepartmentStat) =>
        dept.averageGpa !== null ? (
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
            {dept.averageGpa.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-400">N/A</span>
        ),
      className: 'text-center',
    },
    {
      key: 'highestGpa',
      header: 'Highest',
      render: (dept: DepartmentStat) =>
        dept.highestGpa !== null ? (
          <span className="text-green-600 font-medium">
            {dept.highestGpa.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-400">N/A</span>
        ),
      className: 'text-center',
    },
    {
      key: 'lowestGpa',
      header: 'Lowest',
      render: (dept: DepartmentStat) =>
        dept.lowestGpa !== null ? (
          <span className="text-red-600 font-medium">
            {dept.lowestGpa.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-400">N/A</span>
        ),
      className: 'text-center',
    },
    {
      key: 'carryOverCount',
      header: 'Carry-overs',
      render: (dept: DepartmentStat) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-sm font-medium',
            dept.carryOverCount > 10
              ? 'bg-red-100 text-red-800'
              : dept.carryOverCount > 0
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          )}
        >
          {dept.carryOverCount}
        </span>
      ),
      className: 'text-center',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Departments Overview</h1>
        <p className="text-gray-500">
          {facultyStats?.faculty?.name || 'Loading...'}
        </p>
      </div>

      {/* Summary Cards */}
      {facultyStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <BuildingLibraryIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Total Departments</p>
            <p className="text-3xl font-bold text-gray-900">
              {facultyStats.departmentCount}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-3xl font-bold text-gray-900">
              {facultyStats.totalStudents}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-gray-500">Faculty Average GPA</p>
            <p className="text-3xl font-bold text-primary-600">
              {facultyStats.departments.length > 0
                ? (
                    facultyStats.departments.reduce(
                      (sum: number, d: DepartmentStat) => sum + (d.averageGpa || 0),
                      0
                    ) / facultyStats.departments.filter((d: DepartmentStat) => d.averageGpa !== null).length
                  ).toFixed(2)
                : 'N/A'}
            </p>
          </Card>
        </div>
      )}

      {/* Departments Table */}
      <Card title="Department Statistics">
        <Table
          columns={columns}
          data={facultyStats?.departments || []}
          keyExtractor={(dept) => dept.id}
          isLoading={isLoading}
          emptyMessage="No departments found"
        />
      </Card>
    </div>
  );
}