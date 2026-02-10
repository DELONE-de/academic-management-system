// src/components/forms/ScoreEntryForm.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LEVELS, SEMESTERS, formatLevel, formatSemester, generateAcademicYears } from '@/lib/utils';
import { studentsApi, coursesApi, resultsApi, gpaApi } from '@/lib/api';
import { Student, Course, Level, Semester, ScoreEntry } from '@/types';
import toast from 'react-hot-toast';

interface ScoreEntryFormProps {
  departmentId: string;
}

export function ScoreEntryForm({ departmentId }: ScoreEntryFormProps) {
  const [level, setLevel] = useState<string>('');
  const [semester, setSemester] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch students and courses when filters change
  useEffect(() => {
    const fetchData = async () => {
      if (!level || !semester) return;

      setIsFetching(true);
      try {
        const [studentsRes, coursesRes] = await Promise.all([
          studentsApi.getByDepartmentLevel(departmentId, level),
          coursesApi.getByDepartmentLevelSemester(departmentId, level, semester),
        ]);

        if (studentsRes.success) {
          setStudents(studentsRes.data);
        }

        if (coursesRes.success) {
          setCourses(coursesRes.data);
        }

        // Reset scores
        setScores({});
      } catch (error) {
        toast.error('Failed to fetch data');
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [departmentId, level, semester]);

  // Handle score input
  const handleScoreChange = (studentId: string, courseId: string, value: string) => {
    const score = parseInt(value) || 0;
    if (score < 0 || score > 100) return;

    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [courseId]: score,
      },
    }));
  };

  // Submit scores
  const handleSubmit = async () => {
    if (!level || !semester || !academicYear) {
      toast.error('Please select level, semester, and academic year');
      return;
    }

    // Build scores array
    const scoreEntries: ScoreEntry[] = [];
    Object.entries(scores).forEach(([studentId, courseScores]) => {
      Object.entries(courseScores).forEach(([courseId, score]) => {
        if (score > 0) {
          scoreEntries.push({ studentId, courseId, score });
        }
      });
    });

    if (scoreEntries.length === 0) {
      toast.error('Please enter at least one score');
      return;
    }

    setIsLoading(true);
    try {
      const response = await resultsApi.enterScores({
        level,
        semester,
        academicYear,
        scores: scoreEntries,
      });

      if (response.success) {
        toast.success(
          `Successfully entered ${response.data.successCount} scores. ${response.data.errorCount} errors.`
        );

        // Calculate GPAs for all students
        await gpaApi.calculateDepartmentGPAs({
          departmentId,
          level: level as Level,
          semester: semester as Semester,
          academicYear,
        });

        toast.success('GPAs calculated successfully');
        
        // Reset scores after successful submission
        setScores({});
      }
    } catch (error: any) {
      console.error('Score entry error:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to enter scores';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card title="Select Class">
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            options={LEVELS.map((l) => ({ value: l, label: formatLevel(l) }))}
            placeholder="Select level"
          />
          <Select
            label="Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            options={SEMESTERS.map((s) => ({ value: s, label: formatSemester(s) }))}
            placeholder="Select semester"
          />
          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            options={generateAcademicYears().map((y) => ({ value: y, label: y }))}
            placeholder="Select year"
          />
        </div>
      </Card>

      {/* Score Entry Grid */}
      {isFetching ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : students.length > 0 && courses.length > 0 ? (
        <Card title="Enter Scores" subtitle="Enter scores for each student (0-100)">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Student
                  </th>
                  {courses.map((course) => (
                    <th
                      key={course.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div>{course.code}</div>
                      <div className="text-gray-400 font-normal">({course.unit} units)</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm sticky left-0 bg-white z-10">
                      <div className="font-medium text-gray-900">
                        {student.lastName} {student.firstName}
                      </div>
                      <div className="text-gray-500">{student.matricNumber}</div>
                    </td>
                    {courses.map((course) => (
                      <td key={course.id} className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={scores[student.id]?.[course.id] || ''}
                          onChange={(e) =>
                            handleScoreChange(student.id, course.id, e.target.value)
                          }
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="0"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} isLoading={isLoading} size="lg">
              Submit Scores & Calculate GPA
            </Button>
          </div>
        </Card>
      ) : level && semester ? (
        <Card>
          <p className="text-center text-gray-500 py-8">
            No students or courses found for the selected level and semester.
          </p>
        </Card>
      ) : null}
    </div>
  );
}