// FILE: frontend/src/app/(dashboard)/dashboard/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { reportsApi } from '@/lib/api';
import {
  UserGroupIcon,
  CloudArrowUpIcon,
  CheckBadgeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DashboardData {
  totalStudents: number;
  pendingApprovals: number;
  publishedBatches: number;
  recentJobs: Array<{
    id: string;
    fileName: string;
    status: string;
    totalRows: number;
    issuesFound: number;
    issuesPending: number;
    createdAt: string;
    uploadedBy: { firstName: string; lastName: string };
  }>;
  gpaDistribution: {
    firstClass: number;
    secondUpper: number;
    secondLower: number;
    thirdClass: number;
    pass: number;
    fail: number;
  };
}

const JOB_STATUS_COLOR: Record<string, string> = {
  PROCESSING:   'bg-blue-100 text-blue-700',
  NEEDS_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED:     'bg-green-100 text-green-700',
  REJECTED:     'bg-red-100 text-red-700',
  PENDING:      'bg-gray-100 text-gray-600',
};

const GPA_BANDS = [
  { key: 'firstClass',   label: 'First Class',        color: 'bg-green-500' },
  { key: 'secondUpper',  label: '2nd Upper',           color: 'bg-blue-500' },
  { key: 'secondLower',  label: '2nd Lower',           color: 'bg-indigo-400' },
  { key: 'thirdClass',   label: 'Third Class',         color: 'bg-yellow-400' },
  { key: 'pass',         label: 'Pass',                color: 'bg-orange-400' },
  { key: 'fail',         label: 'Fail',                color: 'bg-red-500' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.getDashboardStats()
      .then((r) => r.success && setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const totalGpa = data
    ? Object.values(data.gpaDistribution).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
        <p className="text-gray-500 text-sm">
          {user?.role === 'HOD' ? 'Department overview' : 'Faculty overview'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students',      value: data?.totalStudents ?? 0,      icon: UserGroupIcon,    color: 'bg-blue-500' },
          { label: 'Pending Approvals',   value: data?.pendingApprovals ?? 0,   icon: ClockIcon,        color: 'bg-yellow-500' },
          { label: 'Published Batches',   value: data?.publishedBatches ?? 0,   icon: CheckBadgeIcon,   color: 'bg-green-500' },
          { label: 'Recent Uploads',      value: data?.recentJobs.length ?? 0,  icon: CloudArrowUpIcon, color: 'bg-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={cn('p-3 rounded-full', color)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPA Distribution */}
        <Card title="GPA Distribution" subtitle={totalGpa > 0 ? `${totalGpa} students with recorded GPAs` : 'No GPA data yet'}>
          {totalGpa === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No GPA data recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {GPA_BANDS.map(({ key, label, color }) => {
                const count = (data?.gpaDistribution as any)[key] ?? 0;
                const pct = totalGpa > 0 ? Math.round((count / totalGpa) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-900">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Upload Jobs */}
        <Card
          title="Recent Uploads"
          headerAction={
            <Link href="/scores/upload" className="text-sm text-primary-600 hover:underline">
              New upload
            </Link>
          }
        >
          {!data?.recentJobs.length ? (
            <p className="text-sm text-gray-400 text-center py-8">No uploads yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentJobs.map((job) => (
                <div key={job.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {job.uploadedBy.firstName} {job.uploadedBy.lastName} · {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.issuesPending > 0 && (
                      <Link href={`/review/${job.id}`} className="text-xs text-yellow-600 hover:underline">
                        {job.issuesPending} to review
                      </Link>
                    )}
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', JOB_STATUS_COLOR[job.status] ?? 'bg-gray-100 text-gray-600')}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/students',      label: 'Students',         icon: '👥' },
            { href: '/scores/upload', label: 'Upload Scores',    icon: '📤' },
            { href: '/approval',      label: 'Approvals',        icon: '✅' },
            { href: '/reports',       label: 'Reports',          icon: '📊' },
          ].map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-center">
              <span className="text-2xl mb-1">{icon}</span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
