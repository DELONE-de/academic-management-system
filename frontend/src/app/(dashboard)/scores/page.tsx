// FILE: frontend/src/app/(dashboard)/scores/page.tsx

'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { 
  PencilSquareIcon, 
  CloudArrowUpIcon, 
  PlusCircleIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

export default function ScoresPage() {
  const { user } = useAuth();

  if (user?.role !== 'HOD') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Only HODs can manage scores.</p>
      </div>
    );
  }

  const scoreOptions = [
    {
      href: '/scores/entry',
      icon: PencilSquareIcon,
      title: 'Manual Score Entry',
      description: 'Enter scores for multiple students at once using the grid interface',
      color: 'bg-blue-500',
    },
    {
      href: '/scores/upload',
      icon: CloudArrowUpIcon,
      title: 'Bulk Upload Scores',
      description: 'Import scores from an Excel file for batch processing',
      color: 'bg-green-500',
    },
    {
      href: '/scores/manage',
      icon: PlusCircleIcon,
      title: 'Add/Delete Single Score',
      description: 'Add or remove individual student scores with instant GPA updates',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Score Management</h1>
        <p className="text-gray-500">Choose how you want to enter or manage student scores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scoreOptions.map((option) => (
          <Link key={option.href} href={option.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <div className={`${option.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <option.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <Card title="Quick Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Grading Scale</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>A (70-100) = 5 points</p>
              <p>B (60-69) = 4 points</p>
              <p>C (50-59) = 3 points</p>
              <p>D (45-49) = 2 points</p>
              <p>E (40-44) = 1 point</p>
              <p>F (Below pass mark) = 0 points</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">GPA Calculation</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>GPA</strong> = Σ(Point × Unit) / Σ(Units)</p>
              <p><strong>CGPA</strong> = Cumulative GPA across all semesters</p>
              <p className="mt-2 text-yellow-600">
                Carry-over: Score below department pass mark
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}