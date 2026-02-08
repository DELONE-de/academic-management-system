// src/app/(dashboard)/scores/page.tsx

'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ScoreEntryForm } from '@/components/forms/ScoreEntryForm';

export default function ScoresPage() {
  const { user } = useAuth();

  if (user?.role !== 'HOD' || !user.departmentId) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Only HODs can enter scores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Score Entry</h1>
        <p className="text-gray-500">
          Enter student scores for a specific level and semester
        </p>
      </div>

      <ScoreEntryForm departmentId={user.departmentId} />
    </div>
  );
}