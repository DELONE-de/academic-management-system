'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { departmentsApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AcademicCapIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';

const departmentSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  code: z.string().min(2, 'Code is required').max(10),
  passMark: z.number().min(1).max(100),
  description: z.string().optional(),
  facultyId: z.string().min(1, 'Faculty is required'),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export default function SetupPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isDean = isAuthenticated && user?.role === 'DEAN';

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { passMark: 40, facultyId: '' },
  });

  const fetchDepartments = async () => {
    setFetchError(null);
    try {
      const res = await departmentsApi.getAll();
      if (res.data) setDepartments(res.data);
      if (res.error) setFetchError(res.error);
    } catch {
      setFetchError('Failed to load departments');
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      fetchDepartments();
      departmentsApi.getAll().then((res) => {
        if (res.data) {
          const uniqueFaculties = Array.from(
            new Map(
              res.data
                .filter((d: any) => d.faculty)
                .map((d: any) => [d.faculty.id, d.faculty])
            ).values()
          );
          setFaculties(uniqueFaculties);
        }
      });
    }
  }, [isAuthenticated, isLoading, router]);

  const handleCreate = async (data: DepartmentFormData) => {
    setIsSubmitting(true);
    try {
      const res = await departmentsApi.createPublic(data);
      if (res.data) {
        toast.success('Department created');
        form.reset({ passMark: 40, facultyId: data.facultyId });
        fetchDepartments();
      } else {
        toast.error(res.error || 'Failed to create department');
      }
    } catch {
      toast.error('Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department? This will remove all associated students, courses and results.')) return;
    try {
      const res = await departmentsApi.deletePublic(id);
      if (res.error) toast.error(res.error);
      else toast.success('Department deleted');
      fetchDepartments();
    } catch {
      toast.error('Failed to delete department');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isDean) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">Only Deans can manage departments.</p>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-3 rounded-full">
                <AcademicCapIcon className="h-12 w-12 text-primary-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Department Management</h1>
            <p className="mt-2 text-gray-500">Create and manage departments (Dean only)</p>
          </div>

          {fetchError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {fetchError}
            </div>
          )}

          <form onSubmit={form.handleSubmit(handleCreate)} className="grid grid-cols-2 gap-3 mb-6">
            <Input
              label="Department Name"
              placeholder="e.g. Health Information Management"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <Input
              label="Code"
              placeholder="e.g. HIM"
              error={form.formState.errors.code?.message}
              {...form.register('code')}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
              <select
                {...form.register('facultyId')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Faculty</option>
                {faculties.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                ))}
              </select>
              {form.formState.errors.facultyId && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.facultyId.message}</p>
              )}
            </div>
            <Input
              label="Pass Mark (%)"
              type="number"
              error={form.formState.errors.passMark?.message}
              {...form.register('passMark', { valueAsNumber: true })}
            />
            <div className="flex items-end">
              <Button type="submit" isLoading={isSubmitting} className="w-full">
                <PlusIcon className="h-4 w-4 mr-1" /> Add Department
              </Button>
            </div>
          </form>

          <div className="divide-y divide-gray-100">
            {departments.length === 0 && !fetchError && (
              <p className="text-center text-gray-400 py-6">No departments yet</p>
            )}
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{d.name}</p>
                  <p className="text-sm text-gray-500">{d.code} · Pass mark: {d.passMark}% · {d.faculty?.name}</p>
                </div>
                <button onClick={() => handleDelete(d.id)} className="p-1 text-gray-400 hover:text-red-600">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between text-sm">
            <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}