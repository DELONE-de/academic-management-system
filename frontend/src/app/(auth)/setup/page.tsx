'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export default function SetupPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { passMark: 40 },
  });

  const fetchDepartments = async () => {
    try {
      const res = await departmentsApi.getAllPublic();
      if (res.success) setDepartments(res.data || []);
    } catch {
      toast.error('Failed to load departments');
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleCreate = async (data: DepartmentFormData) => {
    setIsSubmitting(true);
    try {
      const res = await departmentsApi.createPublic({ ...data, facultyId: '' });
      if (res.success) {
        toast.success('Department created');
        form.reset({ passMark: 40 });
        fetchDepartments();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    try {
      await departmentsApi.deletePublic(id);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900">System Setup</h1>
            <p className="mt-2 text-gray-500">Add departments before users sign up</p>
          </div>

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
            {departments.length === 0 && (
              <p className="text-center text-gray-400 py-6">No departments yet</p>
            )}
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{d.name}</p>
                  <p className="text-sm text-gray-500">{d.code} · Pass mark: {d.passMark}%</p>
                </div>
                <button onClick={() => handleDelete(d.id)} className="p-1 text-gray-400 hover:text-red-600">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between text-sm">
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Back to Login
            </Link>
            <Link href="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign Up →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
