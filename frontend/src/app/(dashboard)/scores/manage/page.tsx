// FILE: frontend/src/app/(dashboard)/scores/manage/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { studentsApi, coursesApi, resultsApi, gpaApi } from '@/lib/api';
import { Student, Course, Result, SemesterGPA, AddScoreInput } from '@/types';
import { formatLevel, formatSemester, getGradeColor, LEVELS, SEMESTERS, generateAcademicYears, cn } from '@/lib/utils';
import { 
  PlusIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ManageScoresPage() {
  const { user } = useAuth();
  
  // Filters
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentResults, setStudentResults] = useState<Result[]>([]);
  const [studentGPA, setStudentGPA] = useState<SemesterGPA | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<Result | null>(null);
  
  // Form state
  const [selectedCourse, setSelectedCourse] = useState('');
  const [score, setScore] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingResults, setIsFetchingResults] = useState(false);

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.departmentId) return;
      
      try {
        setIsLoading(true);
        const params: any = { departmentId: user.departmentId };
        if (level) params.level = level;
        
        const response = await studentsApi.getAll(params);
        if (response.success) {
          setStudents(response.data || []);
        }
      } catch (error) {
        toast.error('Failed to fetch students');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [user?.departmentId, level]);

  // Fetch courses when level/semester selected
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.departmentId || !level || !semester) {
        setCourses([]);
        return;
      }
      
      try {
        const response = await coursesApi.getByDepartmentLevelSemester(
          user.departmentId,
          level,
          semester
        );
        if (response.success) {
          setCourses(response.data || []);
        }
      } catch (error) {
        toast.error('Failed to fetch courses');
      }
    };

    fetchCourses();
  }, [user?.departmentId, level, semester]);

  // Fetch student results and GPA
  const fetchStudentData = useCallback(async (studentId: string) => {
    if (!level || !semester || !academicYear) return;
    
    setIsFetchingResults(true);
    try {
      const [resultsRes, gpaRes] = await Promise.all([
        resultsApi.getStudentResults(studentId, { level, semester, academicYear }),
        gpaApi.getSemesterGPA(studentId, { level, semester, academicYear }).catch(() => null),
      ]);

      if (resultsRes.success) {
        setStudentResults(resultsRes.data || []);
      }

      if (gpaRes?.success) {
        setStudentGPA(gpaRes.data || null);
      } else {
        setStudentGPA(null);
      }
    } catch (error) {
      console.error('Failed to fetch student data:', error);
    } finally {
      setIsFetchingResults(false);
    }
  }, [level, semester, academicYear]);

  // Handle student selection
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setStudentResults([]);
    setStudentGPA(null);
    
    if (level && semester && academicYear) {
      await fetchStudentData(student.id);
    }
  };

  // Handle add score
  const handleAddScore = async () => {
    if (!selectedStudent || !selectedCourse || !score || !level || !semester || !academicYear) {
      toast.error('Please fill in all fields');
      return;
    }

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error('Score must be between 0 and 100');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: AddScoreInput = {
        studentId: selectedStudent.id,
        courseId: selectedCourse,
        score: scoreNum,
        level: level as any,
        semester: semester as any,
        academicYear,
      };

      const response = await resultsApi.addScore(input);
      
      if (response.success) {
        toast.success(response.message);
        setShowAddModal(false);
        setSelectedCourse('');
        setScore('');
        
        // Refresh student data
        await fetchStudentData(selectedStudent.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add score');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete score
  const handleDeleteScore = async () => {
    if (!resultToDelete || !selectedStudent) return;

    setIsSubmitting(true);
    try {
      const response = await resultsApi.deleteScore(resultToDelete.id);
      
      if (response.success) {
        toast.success(response.message);
        setShowDeleteModal(false);
        setResultToDelete(null);
        
        // Refresh student data
        await fetchStudentData(selectedStudent.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete score');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter students by search
  const filteredStudents = students.filter(s => 
    s.matricNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get available courses (not already scored)
  const availableCourses = courses.filter(
    c => !studentResults.some(r => r.courseId === c.id)
  );

  if (user?.role !== 'HOD') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Only HODs can manage scores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Scores</h1>
        <p className="text-gray-500">Add or delete individual student scores</p>
      </div>

      {/* Filters */}
      <Card title="Select Class">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Level"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setSelectedStudent(null);
              setStudentResults([]);
            }}
            options={LEVELS.map(l => ({ value: l, label: formatLevel(l) }))}
            placeholder="Select level"
          />
          <Select
            label="Semester"
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              setStudentResults([]);
            }}
            options={SEMESTERS.map(s => ({ value: s, label: formatSemester(s) }))}
            placeholder="Select semester"
          />
          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(e) => {
              setAcademicYear(e.target.value);
              setStudentResults([]);
            }}
            options={generateAcademicYears().map(y => ({ value: y, label: y }))}
            placeholder="Select year"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <Card title="Students" className="lg:col-span-1">
          <div className="max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No students found</p>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedStudent?.id === student.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <p className="font-medium text-gray-900">
                      {student.lastName} {student.firstName}
                    </p>
                    <p className="text-sm text-gray-500">{student.matricNumber}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Student Scores */}
        <Card 
          title={selectedStudent ? `Scores: ${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Select a Student'}
          className="lg:col-span-2"
          headerAction={
            selectedStudent && level && semester && academicYear && (
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Score
              </Button>
            )
          }
        >
          {!selectedStudent ? (
            <div className="text-center py-12">
              <AcademicCapIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Select a student to view and manage scores</p>
            </div>
          ) : !level || !semester || !academicYear ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
              <p className="text-gray-500">Select level, semester, and academic year to view scores</p>
            </div>
          ) : isFetchingResults ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* GPA Display */}
              {studentGPA && (
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm opacity-80">Semester GPA</p>
                      <p className="text-3xl font-bold">{studentGPA.gpa.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">CGPA</p>
                      <p className="text-2xl font-semibold">
                        {studentGPA.cumulativeGpa?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Units</p>
                      <p className="text-xl">{studentGPA.totalUnits}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Table */}
              {studentResults.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No scores recorded for this semester</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Point</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentResults.map((result) => (
                        <tr key={result.id} className={result.isCarryOver ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{result.course?.code}</div>
                            <div className="text-sm text-gray-500">{result.course?.title}</div>
                          </td>
                          <td className="px-4 py-3 text-center">{result.course?.unit}</td>
                          <td className="px-4 py-3 text-center font-semibold">{result.score}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('px-2 py-1 rounded text-xs font-medium', getGradeColor(result.grade))}>
                              {result.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{result.gradePoint}</td>
                          <td className="px-4 py-3 text-center">
                            {result.isCarryOver ? (
                              <span className="text-red-600 font-medium">Carry Over</span>
                            ) : (
                              <span className="text-green-600">Pass</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setResultToDelete(result);
                                setShowDeleteModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Add Score Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedCourse('');
          setScore('');
        }}
        title="Add Score"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Student</p>
            <p className="font-medium text-gray-900">
              {selectedStudent?.firstName} {selectedStudent?.lastName} ({selectedStudent?.matricNumber})
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatLevel(level as any)} • {formatSemester(semester as any)} • {academicYear}
            </p>
          </div>

          <Select
            label="Course"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            options={availableCourses.map(c => ({
              value: c.id,
              label: `${c.code} - ${c.title} (${c.unit} units)`,
            }))}
            placeholder="Select course"
            required
          />

          {availableCourses.length === 0 && (
            <p className="text-sm text-yellow-600">
              All courses for this semester have been scored.
            </p>
          )}

          <Input
            label="Score"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Enter score (0-100)"
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddScore} 
              isLoading={isSubmitting}
              disabled={!selectedCourse || !score}
            >
              Add Score
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setResultToDelete(null);
        }}
        title="Delete Score"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              Are you sure you want to delete this score? This action cannot be undone.
            </p>
          </div>

          {resultToDelete && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Course</p>
              <p className="font-medium text-gray-900">{resultToDelete.course?.code} - {resultToDelete.course?.title}</p>
              <p className="text-sm text-gray-500 mt-1">Score: {resultToDelete.score} • Grade: {resultToDelete.grade}</p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            The student's GPA will be automatically recalculated after deletion.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteScore} isLoading={isSubmitting}>
              Delete Score
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}