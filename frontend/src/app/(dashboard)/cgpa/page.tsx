// src/app/(dashboard)/cgpa/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { gpaApi, studentsApi } from '@/lib/api';
import { Student, SemesterGPA } from '@/types';
import { formatLevel, formatSemester, LEVELS, getClassOfDegree, getClassColor, cn } from '@/lib/utils';
import { AcademicCapIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CGPAPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [gpaHistory, setGpaHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await studentsApi.getAll({
        departmentId: user?.departmentId || undefined,
        level: levelFilter || undefined,
        search: search || undefined,
      });
      if (response.success) {
        setStudents(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  }, [user?.departmentId, levelFilter, search]);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user, fetchStudents]);

  const fetchStudentGPAHistory = async (studentId: string) => {
    setLoadingHistory(true);
    setSelectedStudent(studentId);
    try {
      const response = await gpaApi.getStudentGPAHistory(studentId);
      if (response.success) {
        setGpaHistory(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch GPA history');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CGPA Overview</h1>
        <p className="text-gray-500">
          View cumulative GPA for all students
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="lg:col-span-1">
          <Card title="Students">
            <div className="space-y-4">
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
              <Select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Levels' },
                  ...LEVELS.map((l) => ({ value: l, label: formatLevel(l) })),
                ]}
              />
            </div>

            <div className="mt-4 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : students.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No students found</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => fetchStudentGPAHistory(student.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-colors',
                        selectedStudent === student.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <p className="font-medium text-gray-900">
                        {student.lastName} {student.firstName}
                      </p>
                      <p className="text-sm text-gray-500">{student.matricNumber}</p>
                      <p className="text-xs text-gray-400">
                        {formatLevel(student.currentLevel)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* GPA Details */}
        <div className="lg:col-span-2">
          {loadingHistory ? (
            <Card>
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            </Card>
          ) : gpaHistory ? (
            <div className="space-y-6">
              {/* Student Info & CGPA */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {gpaHistory.student.name}
                    </h2>
                    <p className="text-gray-500">{gpaHistory.student.matricNumber}</p>
                    <p className="text-sm text-gray-400">
                      {formatLevel(gpaHistory.student.currentLevel)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Cumulative GPA</p>
                    <p className="text-4xl font-bold text-primary-600">
                      {gpaHistory.cgpa.toFixed(2)}
                    </p>
                    <span
                      className={cn(
                        'inline-block px-3 py-1 rounded-full text-sm font-medium mt-2',
                        getClassColor(gpaHistory.cgpa)
                      )}
                    >
                      {getClassOfDegree(gpaHistory.cgpa)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500">Total Units:</span>
                    <span className="font-medium ml-2">{gpaHistory.totalUnits}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Points:</span>
                    <span className="font-medium ml-2">{gpaHistory.totalPoints.toFixed(2)}</span>
                  </div>
                  <Link
                    href={`/students/${selectedStudent}`}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Full Details →
                  </Link>
                </div>
              </Card>

              {/* Semester GPA History */}
              <Card title="Semester GPA History">
                {gpaHistory.semesterGpas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Level
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Semester
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Year
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Units
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Points
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            GPA
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            CGPA
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {gpaHistory.semesterGpas.map((gpa: SemesterGPA) => (
                          <tr key={gpa.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatLevel(gpa.level)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatSemester(gpa.semester)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {gpa.academicYear}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {gpa.totalUnits}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {gpa.totalPoints.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span
                                className={cn(
                                  'px-2 py-1 rounded-full text-sm font-medium',
                                  gpa.gpa >= 4.5
                                    ? 'bg-green-100 text-green-800'
                                    : gpa.gpa >= 3.5
                                    ? 'bg-blue-100 text-blue-800'
                                    : gpa.gpa >= 2.4
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                )}
                              >
                                {gpa.gpa.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center font-semibold text-primary-600">
                              {gpa.cumulativeGpa?.toFixed(2) || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No GPA records found for this student
                  </p>
                )}
              </Card>
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Select a student to view their CGPA history
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}