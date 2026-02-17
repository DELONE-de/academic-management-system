// src/app/(dashboard)/scores/entry/page.tsx

'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ScoreEntryForm } from '@/components/forms/ScoreEntryForm';

export default function ScoreEntryPage() {
  const { user } = useAuth();

  if (user?.role !== 'HOD') {
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
        <h1 className="text-2xl font-bold text-gray-900">Manual Score Entry</h1>
        <p className="text-gray-500">Enter scores for students manually</p>
      </div>

      <ScoreEntryForm departmentId={user.departmentId!} />
    </div>
  );
}
