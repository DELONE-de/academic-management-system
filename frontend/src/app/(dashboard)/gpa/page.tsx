// src/app/(dashboard)/gpa/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { gpaApi, departmentsApi } from '@/lib/api';
import { formatLevel, formatSemester, LEVELS, SEMESTERS, generateAcademicYears, getClassColor, cn } from '@/lib/utils';
import { Level, Semester, Department } from '@/types';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface GPAStats {
  count: number;
  highestGpa: { value: number; student: any } | null;
  lowestGpa: { value: number; student: any } | null;
  averageGpa: number | null;
  distribution: {
    firstClass: number;
    secondUpper: number;
    secondLower: number;
    thirdClass: number;
    pass: number;
    fail: number;
  };
}

export default function GPAPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [semester, setSemester] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [stats, setStats] = useState<GPAStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch departments for Dean
  useEffect(() => {
    const fetchDepartments = async () => {
      if (user?.role === 'DEAN') {
        try {
          const response = await departmentsApi.getAll(user.facultyId || undefined);
          if (response.success) {
            setDepartments(response.data);
          }
        } catch (error) {
          toast.error('Failed to fetch departments');
        }
      } else if (user?.role === 'HOD' && user.departmentId) {
        setSelectedDepartment(user.departmentId);
      }
    };

    if (user) {
      fetchDepartments();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!selectedDepartment) {
      toast.error('Please select a department');
      return;
    }

    setIsLoading(true);
    try {
      const response = await gpaApi.getDepartmentStats(selectedDepartment, {
        level: level || undefined,
        semester: semester || undefined,
        academicYear: academicYear || undefined,
      });

      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch GPA statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const distributionData = stats?.distribution
    ? [
        { label: 'First Class (4.50-5.00)', value: stats.distribution.firstClass, color: 'bg-green-500' },
        { label: 'Second Upper (3.50-4.49)', value: stats.distribution.secondUpper, color: 'bg-blue-500' },
        { label: 'Second Lower (2.40-3.49)', value: stats.distribution.secondLower, color: 'bg-yellow-500' },
        { label: 'Third Class (1.50-2.39)', value: stats.distribution.thirdClass, color: 'bg-orange-500' },
        { label: 'Pass (1.00-1.49)', value: stats.distribution.pass, color: 'bg-purple-500' },
        { label: 'Fail (< 1.00)', value: stats.distribution.fail, color: 'bg-red-500' },
      ]
    : [];

  const totalStudents = distributionData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GPA Statistics</h1>
        <p className="text-gray-500">
          View GPA statistics and distributions
        </p>
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {user?.role === 'DEAN' && (
            <Select
              label="Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              options={[
                { value: '', label: 'Select Department' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          )}
          <Select
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            options={[
              { value: '', label: 'All Levels' },
              ...LEVELS.map((l) => ({ value: l, label: formatLevel(l) })),
            ]}
          />
          <Select
            label="Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            options={[
              { value: '', label: 'All Semesters' },
              ...SEMESTERS.map((s) => ({ value: s, label: formatSemester(s) })),
            ]}
          />
          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            options={[
              { value: '', label: 'All Years' },
              ...generateAcademicYears().map((y) => ({ value: y, label: y })),
            ]}
          />
          <div className="flex items-end">
            <Button onClick={fetchStats} isLoading={isLoading} className="w-full">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Statistics
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics Display */}
      {stats && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center">
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.count}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Highest GPA</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.highestGpa?.value.toFixed(2) || 'N/A'}
              </p>
              {stats.highestGpa?.student && (
                <p className="text-xs text-gray-400 mt-1">
                  {stats.highestGpa.student.matricNumber}
                </p>
              )}
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Lowest GPA</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {stats.lowestGpa?.value.toFixed(2) || 'N/A'}
              </p>
              {stats.lowestGpa?.student && (
                <p className="text-xs text-gray-400 mt-1">
                  {stats.lowestGpa.student.matricNumber}
                </p>
              )}
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Average GPA</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">
                {stats.averageGpa?.toFixed(2) || 'N/A'}
              </p>
            </Card>
          </div>

          {/* Distribution Chart */}
          <Card title="Class Distribution">
            <div className="space-y-4">
              {distributionData.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">
                      {item.value} ({totalStudents > 0 ? ((item.value / totalStudents) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={cn('h-4 rounded-full transition-all duration-500', item.color)}
                      style={{
                        width: `${totalStudents > 0 ? (item.value / totalStudents) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!stats && !isLoading && (
        <Card>
          <div className="text-center py-12">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Select filters and click "View Statistics" to see GPA data
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}