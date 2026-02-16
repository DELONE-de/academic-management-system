// FILE: frontend/src/app/(dashboard)/students/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { studentsApi } from '@/lib/api';
import { Student } from '@/types';
import { formatLevel, LEVELS } from '@/lib/utils';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await studentsApi.getAll({
        departmentId: user?.departmentId || undefined,
        level: levelFilter || undefined,
        search: search || undefined,
        page,
        limit,
      });
      if (response.success) {
        setStudents(response.data || []);
        setTotal(response.meta?.total || 0);
      }
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  }, [user?.departmentId, search, levelFilter, page]);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user, fetchStudents]);

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
          {student.email && <div className="text-sm text-gray-500">{student.email}</div>}
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
        <div className="flex gap-3">
          {user?.role === 'HOD' && (
            <>
              <Link href="/students/upload">
                <Button variant="outline">
                  <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                  Bulk Import
                </Button>
              </Link>
              <Link href="/students/new">
                <Button>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Student
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or matric number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            options={[
              { value: '', label: 'All Levels' },
              ...LEVELS.map((l) => ({ value: l, label: formatLevel(l) })),
            ]}
            className="w-48"
          />
        </div>

        <Table
          columns={columns}
          data={students}
          keyExtractor={(student) => student.id}
          isLoading={isLoading}
          emptyMessage="No students found"
        />

        {total > limit && (
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}