// src/app/(dashboard)/reports/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { reportsApi, departmentsApi } from '@/lib/api';
import { Department, DepartmentStats } from '@/types';
import {
  formatLevel,
  formatSemester,
  LEVELS,
  SEMESTERS,
  generateAcademicYears,
  downloadBlob,
  getGradeColor,
  cn,
} from '@/lib/utils';
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface StudentReportData {
  studentId: string;
  matricNumber: string;
  studentName: string;
  gpa: number;
  cgpa?: number;
  results: Array<{
    courseCode: string;
    courseTitle: string;
    unit: number;
    score: number;
    grade: string;
    gradePoint: number;
    pxu: number;
    isCarryOver: boolean;
  }>;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [semester, setSemester] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [reportData, setReportData] = useState<{
    department: any;
    stats: DepartmentStats;
    students: StudentReportData[];
  } | null>(null);

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

  const generateReport = async () => {
    if (!selectedDepartment || !level || !semester || !academicYear) {
      toast.error('Please fill in all filters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await reportsApi.getDepartmentReport(selectedDepartment, {
        level,
        semester,
        academicYear,
      });

      if (response.success) {
        setReportData(response.data);
        toast.success('Report generated successfully');
      }
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!selectedDepartment || !level || !semester || !academicYear) {
      toast.error('Please generate a report first');
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await reportsApi.downloadDepartmentReportPDF(selectedDepartment, {
        level,
        semester,
        academicYear,
      });

      const filename = `report-${reportData?.department?.code || 'dept'}-${level}-${semester}-${academicYear.replace('/', '-')}.pdf`;
      downloadBlob(blob, filename);
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  const studentColumns = [
    {
      key: 'sn',
      header: 'S/N',
      render: (_: StudentReportData, index: number) => index + 1,
      className: 'w-12',
    },
    {
      key: 'matricNumber',
      header: 'Matric No.',
      render: (student: StudentReportData) => (
        <span className="font-medium">{student.matricNumber}</span>
      ),
    },
    {
      key: 'studentName',
      header: 'Name',
    },
    {
      key: 'gpa',
      header: 'GPA',
      render: (student: StudentReportData) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-sm font-medium',
            student.gpa >= 4.5
              ? 'bg-green-100 text-green-800'
              : student.gpa >= 3.5
              ? 'bg-blue-100 text-blue-800'
              : student.gpa >= 2.4
              ? 'bg-yellow-100 text-yellow-800'
              : student.gpa >= 1.5
              ? 'bg-orange-100 text-orange-800'
              : 'bg-red-100 text-red-800'
          )}
        >
          {student.gpa.toFixed(2)}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'cgpa',
      header: 'CGPA',
      render: (student: StudentReportData) => (
        <span className="font-semibold text-primary-600">
          {student.cgpa?.toFixed(2) || 'N/A'}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'carryovers',
      header: 'Carry-overs',
      render: (student: StudentReportData) => {
        const count = student.results.filter((r) => r.isCarryOver).length;
        return count > 0 ? (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            {count}
          </span>
        ) : (
          <span className="text-green-600">0</span>
        );
      },
      className: 'text-center',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">
          Generate and download department performance reports
        </p>
      </div>

      {/* Filters */}
      <Card title="Report Filters">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {user?.role === 'DEAN' && (
            <Select
              label="Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              options={[
                { value: '', label: 'Select Department' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
              required
            />
          )}
          <Select
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            options={[
              { value: '', label: 'Select Level' },
              ...LEVELS.map((l) => ({ value: l, label: formatLevel(l) })),
            ]}
            required
          />
          <Select
            label="Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            options={[
              { value: '', label: 'Select Semester' },
              ...SEMESTERS.map((s) => ({ value: s, label: formatSemester(s) })),
            ]}
            required
          />
          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            options={[
              { value: '', label: 'Select Year' },
              ...generateAcademicYears().map((y) => ({ value: y, label: y })),
            ]}
            required
          />
          <div className="flex items-end gap-2">
            <Button onClick={generateReport} isLoading={isLoading} className="flex-1">
              Generate Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Display */}
      {reportData && (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="text-center">
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {reportData.stats.totalStudents}
              </p>
            </Card>
            <Card className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                Highest GPA
              </div>
              <p className="text-2xl font-bold text-green-600">
                {reportData.stats.highestGpa.toFixed(2)}
              </p>
            </Card>
            <Card className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                Lowest GPA
              </div>
              <p className="text-2xl font-bold text-red-600">
                {reportData.stats.lowestGpa.toFixed(2)}
              </p>
            </Card>
            <Card className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <ChartBarIcon className="h-4 w-4 text-primary-500" />
                Average GPA
              </div>
              <p className="text-2xl font-bold text-primary-600">
                {reportData.stats.averageGpa.toFixed(2)}
              </p>
            </Card>
            <Card className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
                Carry-overs
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {reportData.stats.carryOverCount}
              </p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Pass Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.stats.passRate.toFixed(1)}%
              </p>
            </Card>
          </div>

          {/* Report Header & Download Button */}
          <Card
            title={`${reportData.department.name} - ${formatLevel(level as any)} ${formatSemester(semester as any)} (${academicYear})`}
            subtitle={reportData.department.facultyName}
            headerAction={
              <Button
                onClick={downloadPDF}
                isLoading={isDownloading}
                variant="success"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Download PDF
              </Button>
            }
          >
            <Table
              columns={studentColumns}
              data={reportData.students}
              keyExtractor={(student) => student.studentId}
              emptyMessage="No students found for this selection"
            />
          </Card>

          {/* Detailed Results (Expandable) */}
          <Card title="Detailed Student Results">
            <div className="space-y-6">
              {reportData.students.map((student) => (
                <details key={student.studentId} className="group">
                  <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{student.matricNumber}</span>
                      <span className="text-gray-600">{student.studentName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-sm font-medium',
                          student.gpa >= 3.5
                            ? 'bg-green-100 text-green-800'
                            : student.gpa >= 2.4
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        )}
                      >
                        GPA: {student.gpa.toFixed(2)}
                      </span>
                      <svg
                        className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </summary>
                  <div className="mt-2 p-4 border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Code
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Title
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Unit
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Score
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Grade
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Point
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            PxU
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {student.results.map((result, idx) => (
                          <tr
                            key={idx}
                            className={result.isCarryOver ? 'bg-red-50' : ''}
                          >
                            <td className="px-4 py-2 font-medium">
                              {result.courseCode}
                            </td>
                            <td className="px-4 py-2">{result.courseTitle}</td>
                            <td className="px-4 py-2 text-center">{result.unit}</td>
                            <td className="px-4 py-2 text-center">{result.score}</td>
                            <td className="px-4 py-2 text-center">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium',
                                  getGradeColor(result.grade as any)
                                )}
                              >
                                {result.grade}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {result.gradePoint}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {result.pxu.toFixed(1)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {result.isCarryOver ? (
                                <span className="text-red-600 font-medium">
                                  Carry Over
                                </span>
                              ) : (
                                <span className="text-green-600">Pass</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          </Card>
        </>
      )}

      {!reportData && !isLoading && (
        <Card>
          <div className="text-center py-12">
            <DocumentArrowDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Select all filters and click "Generate Report" to view data
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}