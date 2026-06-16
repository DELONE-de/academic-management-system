'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { facultiesApi, departmentsApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { AcademicCapIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';

const facultySchema = z.object({
  name: z.string().min(3, 'Name is required'),
  code: z.string().min(2, 'Code is required').max(10),
  description: z.string().optional(),
});

const departmentSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  code: z.string().min(2, 'Code is required').max(10),
  facultyId: z.string().min(1, 'Faculty is required'),
  passMark: z.number().min(1).max(100),
  description: z.string().optional(),
});

type FacultyFormData = z.infer<typeof facultySchema>;
type DepartmentFormData = z.infer<typeof departmentSchema>;

export default function SetupPage() {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'faculty' | 'department'>('faculty');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const facultyForm = useForm<FacultyFormData>({ resolver: zodResolver(facultySchema) });
  const departmentForm = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { passMark: 40 },
  });

  const fetchData = async () => {
    try {
      const [fRes, dRes] = await Promise.all([
        facultiesApi.getAllPublic(),
        departmentsApi.getAllPublic(),
      ]);
      if (fRes.success) setFaculties(fRes.data || []);
      if (dRes.success) setDepartments(dRes.data || []);
    } catch {
      toast.error('Failed to load data');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateFaculty = async (data: FacultyFormData) => {
    setIsSubmitting(true);
    try {
      const res = await facultiesApi.createPublic(data);
      if (res.success) {
        toast.success('Faculty created');
        facultyForm.reset();
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create faculty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDepartment = async (data: DepartmentFormData) => {
    setIsSubmitting(true);
    try {
      const res = await departmentsApi.createPublic(data);
      if (res.success) {
        toast.success('Department created');
        departmentForm.reset({ passMark: 40 });
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    if (!confirm('Delete this faculty? All its departments will also be deleted.')) return;
    try {
      await facultiesApi.deletePublic(id);
      toast.success('Faculty deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete faculty');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    try {
      await departmentsApi.deletePublic(id);
      toast.success('Department deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-3 rounded-full">
                <AcademicCapIcon className="h-12 w-12 text-primary-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">System Setup</h1>
            <p className="mt-2 text-gray-500">Create faculties and departments before users sign up</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            {(['faculty', 'department'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'faculty' ? `Faculties (${faculties.length})` : `Departments (${departments.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'faculty' && (
            <div className="space-y-6">
              <form onSubmit={facultyForm.handleSubmit(handleCreateFaculty)} className="grid grid-cols-3 gap-3 items-end">
                <Input
                  label="Faculty Name"
                  placeholder="e.g. Basic Medical Sciences"
                  error={facultyForm.formState.errors.name?.message}
                  {...facultyForm.register('name')}
                />
                <Input
                  label="Code"
                  placeholder="e.g. BMS"
                  error={facultyForm.formState.errors.code?.message}
                  {...facultyForm.register('code')}
                />
                <Button type="submit" isLoading={isSubmitting}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Add Faculty
                </Button>
              </form>

              <div className="divide-y divide-gray-100">
                {faculties.length === 0 && (
                  <p className="text-center text-gray-400 py-6">No faculties yet</p>
                )}
                {faculties.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900">{f.name}</p>
                      <p className="text-sm text-gray-500">{f.code} &middot; {f._count?.departments ?? 0} departments</p>
                    </div>
                    <button onClick={() => handleDeleteFaculty(f.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'department' && (
            <div className="space-y-6">
              <form onSubmit={departmentForm.handleSubmit(handleCreateDepartment)} className="grid grid-cols-2 gap-3">
                <Input
                  label="Department Name"
                  placeholder="e.g. Health Information Management"
                  error={departmentForm.formState.errors.name?.message}
                  {...departmentForm.register('name')}
                />
                <Input
                  label="Code"
                  placeholder="e.g. HIM"
                  error={departmentForm.formState.errors.code?.message}
                  {...departmentForm.register('code')}
                />
                <Select
                  label="Faculty"
                  error={departmentForm.formState.errors.facultyId?.message}
                  {...departmentForm.register('facultyId')}
                  options={[
                    { value: '', label: 'Select Faculty' },
                    ...faculties.map((f) => ({ value: f.id, label: f.name })),
                  ]}
                />
                <Input
                  label="Pass Mark"
                  type="number"
                  error={departmentForm.formState.errors.passMark?.message}
                  {...departmentForm.register('passMark', { valueAsNumber: true })}
                />
                <div className="col-span-2 flex justify-end">
                  <Button type="submit" isLoading={isSubmitting}>
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
                      <p className="text-sm text-gray-500">
                        {d.code} &middot; {d.faculty?.name} &middot; Pass mark: {d.passMark}%
                      </p>
                    </div>
                    <button onClick={() => handleDeleteDepartment(d.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
