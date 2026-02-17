// src/app/(dashboard)/courses/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { CourseForm } from '@/components/forms/CourseForm';
import { coursesApi } from '@/lib/api';
import { Course } from '@/types';
import { formatLevel, formatSemester, LEVELS, SEMESTERS } from '@/lib/utils';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await coursesApi.getAll({
        departmentId: user?.departmentId || undefined,
        level: levelFilter || undefined,
        semester: semesterFilter || undefined,
      });
      if (response.success) {
        setCourses(response.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  }, [user?.departmentId, levelFilter, semesterFilter]);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user, fetchCourses]);

  const handleCreate = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await coursesApi.create({
        ...data,
        departmentId: user?.departmentId,
      });
      if (response.success) {
        toast.success('Course created successfully');
        setIsModalOpen(false);
        fetchCourses();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingCourse) return;
    setIsSubmitting(true);
    try {
      const response = await coursesApi.update(editingCourse.id, data);
      if (response.success) {
        toast.success('Course updated successfully');
        setIsModalOpen(false);
        setEditingCourse(null);
        fetchCourses();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await coursesApi.delete(id);
      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    }
  };

  const handleFormSubmit = (data: any) => {
    if (editingCourse) {
      return handleUpdate(data);
    }
    return handleCreate(data);
  };

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (course: Course) => (
        <span className="font-medium text-gray-900">{course.code}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
    },
    {
      key: 'unit',
      header: 'Unit',
      className: 'text-center',
    },
    {
      key: 'level',
      header: 'Level',
      render: (course: Course) => formatLevel(course.level),
    },
    {
      key: 'semester',
      header: 'Semester',
      render: (course: Course) => formatSemester(course.semester),
    },
    {
      key: 'isElective',
      header: 'Type',
      render: (course: Course) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            course.isElective
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {course.isElective ? 'Elective' : 'Core'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (course: Course) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCourse(course);
              setIsModalOpen(true);
            }}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="Edit"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(course.id)}
            className="p-1 text-gray-500 hover:text-red-600"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500">Manage courses for your department</p>
        </div>
        {user?.role === 'HOD' && (
          <Button
            onClick={() => {
              setEditingCourse(null);
              setIsModalOpen(true);
            }}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Course
          </Button>
        )}
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            options={[
              { value: '', label: 'All Levels' },
              ...LEVELS.map((l) => ({ value: l, label: formatLevel(l) })),
            ]}
            className="w-48"
          />
          <Select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            options={[
              { value: '', label: 'All Semesters' },
              ...SEMESTERS.map((s) => ({ value: s, label: formatSemester(s) })),
            ]}
            className="w-48"
          />
        </div>

        <Table
          columns={columns}
          data={courses}
          keyExtractor={(course) => course.id}
          isLoading={isLoading}
          emptyMessage="No courses found"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
        title={editingCourse ? 'Edit Course' : 'Add New Course'}
        size="lg"
      >
        <CourseForm
          course={editingCourse || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCourse(null);
          }}
        isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}     
