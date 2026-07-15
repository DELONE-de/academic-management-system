'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { reportsApi, uploadApi } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    reportsApi.getDashboardStats().then(r => r.success && setStats(r.data)).catch(() => {});
    uploadApi.getJobs().then(setJobs).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500">Welcome, {user?.firstName} ({user?.role})</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Students', value: stats.totalStudents },
            { label: 'Pending Approvals', value: stats.pendingApprovals },
            { label: 'Published Batches', value: stats.publishedBatches },
            { label: 'Recent Uploads', value: stats.recentJobs?.length ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/students', label: 'Students' },
          { href: '/scores/upload', label: 'Upload Scores' },
          { href: '/gpa', label: 'GPA' },
          { href: '/cgpa', label: 'CGPA' },
          { href: '/approval', label: 'Approvals' },
          { href: '/reports', label: 'Reports' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="bg-white border border-gray-200 rounded-xl p-4 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
            {a.label}
          </Link>
        ))}
      </div>

      {jobs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Recent Upload Jobs</h2>
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{j.fileName}</span>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    j.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    j.status === 'NEEDS_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                    j.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{j.status}</span>
                  {j.status === 'NEEDS_REVIEW' && (
                    <Link href={`/review/${j.id}`} className="text-blue-600 hover:underline text-xs">Review</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
