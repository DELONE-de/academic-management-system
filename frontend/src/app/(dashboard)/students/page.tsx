// src/app/(dashboard)/students/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { StudentForm } from '@/components/forms/StudentForm';
import { studentsApi } from '@/lib/api';
import { Student } from '@/types';
import { formatLevel } from '@/lib/utils';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await studentsApi.getAll({
        departmentId: user?.departmentId || undefined,
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
  }, [user?.departmentId, search]);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user, fetchStudents]);

  const handleCreate = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await studentsApi.create({
        ...data,
        departmentId: user?.departmentId,
      });
      if (response.success) {
        toast.success('Student created successfully');
        setIsModalOpen(false);
        fetchStudents();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      const response = await studentsApi.update(editingStudent.id, data);
      if (response.success) {
        toast.success('Student updated successfully');
        setIsModalOpen(false);
        setEditingStudent(null);
        fetchStudents();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentsApi.delete(id);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    }
  };

  const columns = [
    {
      key: 'matricNumber',
      header: 'Matric Number',
      render: (student: Student) => (
        <span className="font-medium text-gray-900">{student.matricNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (student: Student) => (
        <div>
          <div className="font-medium text-gray-900">
            {student.lastName} {student.firstName} {student.middleName}
          </div>
          {student.email && (
            <div className="text-sm text-gray-500">{student.email}</div>
          )}
        </div>
      ),
    },
    {
      key: 'currentLevel',
      header: 'Level',
      render: (student: Student) => formatLevel(student.currentLevel),
    },
    {
      key: 'admissionYear',
      header: 'Admission Year',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student: Student) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/students/${student.id}`}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="View Details"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => {
              setEditingStudent(student);
              setIsModalOpen(true);
            }}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="Edit"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(student.id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500">Manage students in your department</p>
        </div>
        {user?.role === 'HOD' && (
          <Button
            onClick={() => {
              setEditingStudent(null);
              setIsModalOpen(true);
            }}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Student
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Search by name or matric number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={students}
          keyExtractor={(student) => student.id}
          isLoading={isLoading}
          emptyMessage="No students found"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
        size="lg"
      >
        <StudentForm
          student={editingStudent || undefined}
          onSubmit={editingStudent ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingStudent(null);
          }}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}