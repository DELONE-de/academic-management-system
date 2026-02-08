// src/app/(dashboard)/students/[id]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { studentsApi, resultsApi, gpaApi, reportsApi } from '@/lib/api';
import { Student, Result, SemesterGPA } from '@/types';
import { formatLevel, formatSemester, getGradeColor, getClassOfDegree, getClassColor, downloadBlob } from '@/lib/utils';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [gpaHistory, setGpaHistory] = useState<any>(null);
  const [carryOvers, setCarryOvers] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, gpaRes, carryOverRes] = await Promise.all([
          studentsApi.getById(params.id as string),
          gpaApi.getStudentGPAHistory(params.id as string),
          resultsApi.getCarryOvers(params.id as string),
        ]);

        if (studentRes.success) setStudent(studentRes.data);
        if (gpaRes.success) setGpaHistory(gpaRes.data);
        if (carryOverRes.success) setCarryOvers(carryOverRes.data);
      } catch (error) {
        toast.error('Failed to fetch student details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleDownloadTranscript = async () => {
    try {
      const blob = await reportsApi.downloadTranscriptPDF(params.id as string);
      downloadBlob(blob, `transcript-${student?.matricNumber}.pdf`);
      toast.success('Transcript downloaded');
    } catch (error) {
      toast.error('Failed to download transcript');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Student not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {student.lastName} {student.firstName} {student.middleName}
            </h1>
            <p className="text-gray-500">{student.matricNumber}</p>
          </div>
        </div>
        <Button onClick={handleDownloadTranscript}>
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          Download Transcript
        </Button>
      </div>

      {/* Student Info & CGPA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Student Information" className="md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium">{student.department?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Level</p>
              <p className="font-medium">{formatLevel(student.currentLevel)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Admission Year</p>
              <p className="font-medium">{student.admissionYear}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{student.email || 'N/A'}</p>
            </div>
          </div>
        </Card>

        <Card className="text-center">
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-2">Cumulative GPA</p>
            <p className="text-5xl font-bold text-primary-600">
              {gpaHistory?.cgpa?.toFixed(2) || '0.00'}
            </p>
            <p
              className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${getClassColor(
                gpaHistory?.cgpa || 0
              )}`}
            >
              {getClassOfDegree(gpaHistory?.cgpa || 0)}
            </p>
          </div>
        </Card>
      </div>

      {/* Semester GPA History */}
      <Card title="Semester GPA History">
        {gpaHistory?.semesterGpas?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Academic Year
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Units
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    GPA
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    CGPA
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gpaHistory.semesterGpas.map((gpa: SemesterGPA) => (
                  <tr key={gpa.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatLevel(gpa.level)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatSemester(gpa.semester)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{gpa.academicYear}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {gpa.totalUnits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-semibold">{gpa.gpa.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-semibold text-primary-600">
                        {gpa.cumulativeGpa?.toFixed(2) || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No GPA records found</p>
        )}
      </Card>

      {/* Carry-over Courses */}
      {carryOvers.length > 0 && (
        <Card title="Carry-over Courses" className="border-red-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">
                    Course Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-red-600 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-red-600 uppercase">
                    Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-red-600 uppercase">
                    Level/Semester
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {carryOvers.map((result) => (
                  <tr key={result.id} className="hover:bg-red-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {result.course?.code}
                    </td>
                    <td className="px-6 py-4">{result.course?.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {result.course?.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-red-600 font-medium">{result.score}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {formatLevel(result.level)} / {formatSemester(result.semester)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}