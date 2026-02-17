// src/app/(dashboard)/students/new/page.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { StudentForm } from '@/components/forms/StudentForm';
import { studentsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function NewStudentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await studentsApi.create({
        ...data,
        departmentId: user?.departmentId,
      });
      if (response.success) {
        toast.success('Student created successfully');
        router.push('/students');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
          <p className="text-gray-500">Enter student information</p>
        </div>
      </div>

      <Card>
        <StudentForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={isSubmitting}
        />
      </Card>
    </div>
  );
}
