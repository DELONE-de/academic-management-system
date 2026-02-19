// src/app/(auth)/signup/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { departmentsApi } from '@/lib/api';
import { Department } from '@/types';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';
import api from '@/lib/api';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  role: z.enum(['HOD', 'DEAN']),
  departmentId: z.string().optional(),
  facultyId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.role === 'HOD') return !!data.departmentId;
  if (data.role === 'DEAN') return !!data.facultyId;
  return true;
}, {
  message: 'Please select a department or faculty',
  path: ['departmentId'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'HOD' },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptRes = await departmentsApi.getAllPublic();
        if (deptRes.success) {
          setDepartments(deptRes.data || []);
          
          const uniqueFaculties = Array.from(
            new Map(
              deptRes.data
                ?.filter((d: Department) => d.faculty)
                .map((d: Department) => [d.faculty!.id, d.faculty])
            ).values()
          );
          setFaculties(uniqueFaculties);
        }
      } catch (error) {
        toast.error('Failed to load departments');
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/signup', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        departmentId: data.role === 'HOD' ? data.departmentId : undefined,
        facultyId: data.role === 'DEAN' ? data.facultyId : undefined,
      });

      if (response.data.success) {
        toast.success('Account created successfully! Please login.');
        router.push('/login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-3 rounded-full">
                <AcademicCapIcon className="h-12 w-12 text-primary-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="mt-2 text-gray-600">Register as HOD or Dean</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                error={errors.firstName?.message}
                {...register('firstName')}
                required
              />
              <Input
                label="Last Name"
                error={errors.lastName?.message}
                {...register('lastName')}
                required
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              error={errors.email?.message}
              {...register('email')}
              required
            />

            <Select
              label="Role"
              error={errors.role?.message}
              {...register('role')}
              options={[
                { value: 'HOD', label: 'Head of Department (HOD)' },
                { value: 'DEAN', label: 'Dean' },
              ]}
              required
            />

            {selectedRole === 'HOD' && (
              <Select
                label="Department"
                error={errors.departmentId?.message}
                {...register('departmentId')}
                options={[
                  { value: '', label: 'Select Department' },
                  ...departments.map((d) => ({
                    value: d.id,
                    label: `${d.name} (${d.code})`,
                  })),
                ]}
                required
              />
            )}

            {selectedRole === 'DEAN' && (
              <Select
                label="Faculty"
                error={errors.facultyId?.message}
                {...register('facultyId')}
                options={[
                  { value: '', label: 'Select Faculty' },
                  ...faculties.map((f: any) => ({
                    value: f.id,
                    label: `${f.name} (${f.code})`,
                  })),
                ]}
                required
              />
            )}

            <Input
              label="Password"
              type="password"
              error={errors.password?.message}
              {...register('password')}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
              required
            />

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
