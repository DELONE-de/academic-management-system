'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';
import api from '@/lib/api';

export default function BootstrapPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<any[]>([]);

  useEffect(() => {
    // Check if system already has users.
    // NOTE: the API wraps payloads as { success, message, data: {...} } — read
    // r.data.data.bootstrapped, NOT r.data.bootstrapped. Reading the wrong
    // shape made `b` always truthy and redirected every fresh visit to
    // /signup straight to /login.
    api.get('/auth/bootstrap-status').then((r: any) => {
      const payload = r.data?.data ?? r.data;
      const b = payload?.bootstrapped ?? false;
      setBootstrapped(b);
      if (b) {
        router.push('/login');
      }
    }).catch(() => {
      // Do NOT assume "already bootstrapped" on a failure. A failed check (e.g. a
      // 500 from a database outage) should surface an error so the user can retry,
      // not silently redirect to login.
      setStatusError('Could not check system status. Please try again.');
      setBootstrapped(false);
    });

    // Fetch faculties for bootstrap form (payload is wrapped: { data: [...] })
    api.get('/departments/public').then((r: any) => {
      const departments = r.data?.data ?? r.data;
      if (Array.isArray(departments)) {
        const uniqueFaculties = Array.from(
          new Map(
            departments
              .filter((d: any) => d.faculty)
              .map((d: any) => [d.faculty.id, d.faculty])
          ).values()
        );
        setFaculties(uniqueFaculties);
      }
    }).catch(() => {});
  }, [router]);

  const bootstrapSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    facultyId: z.string().min(1, 'Faculty is required'),
  });

  type BootstrapFormData = z.infer<typeof bootstrapSchema>;

  const { register, handleSubmit, formState: { errors } } = useForm<BootstrapFormData>({
    resolver: zodResolver(bootstrapSchema),
  });

  const onSubmit = async (data: BootstrapFormData) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/bootstrap', data);
      if (response.data.success) {
        toast.success('System initialized! Please login with your new account.');
        router.push('/login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize system');
    } finally {
      setIsLoading(false);
    }
  };

  if (bootstrapped === null && !statusError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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
            <h2 className="text-3xl font-bold text-gray-900">Initialize System</h2>
            <p className="mt-2 text-gray-600">
              Create the first administrator account (DEAN)
            </p>
          </div>

          {statusError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800" role="alert">
              <p className="font-medium">{statusError}</p>
              <button
                onClick={() => { setStatusError(null); window.location.reload(); }}
                className="mt-2 text-red-700 hover:underline font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {!statusError && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} required />
                <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} required />
              </div>

              <Input label="Email Address" type="email" error={errors.email?.message} {...register('email')} required />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                <select
                  {...register('facultyId')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Faculty</option>
                  {faculties.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
                {errors.facultyId && <p className="text-red-500 text-xs mt-1">{errors.facultyId.message}</p>}
              </div>

              <Input label="Password" type="password" error={errors.password?.message} {...register('password')} required />

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Create Administrator
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already initialized?{' '}
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