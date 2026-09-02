'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { reportsApi, uploadApi, gpaApi } from '@/lib/api';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isHOD = user?.role === 'HOD';
  const isDean = user?.role === 'DEAN';
  const isExam = user?.role === 'EXAMINATION_OFFICER';
  const isLecturer = user?.role === 'LECTURER';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsResult, jobsResult] = await Promise.all([
          reportsApi.getDashboardStats(),
          uploadApi.getJobs(),
        ]);
        if (cancelled) return;
        if (statsResult.data) setStats(statsResult.data);
        if (statsResult.error) setError(statsResult.error);
        if (jobsResult.data) setJobs(jobsResult.data);
      } catch {
        if (!cancelled) setError('Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-red-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome, {user?.firstName} ({user?.role})
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Students', value: stats?.totalStudents ?? 0, visible: isHOD || isDean },
          { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, visible: isHOD || isDean || isExam },
          { label: 'Published Batches', value: stats?.publishedBatches ?? 0, visible: isHOD || isDean },
          { label: 'Recent Uploads', value: stats?.recentJobs?.length ?? 0, visible: isHOD || isLecturer || isExam },
        ]
          .filter(s => s.visible)
          .map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ...(isHOD || isDean ? [{ href: '/students', label: 'Students' }] : []),
          { href: '/scores/upload', label: 'Upload Scores' },
          ...(isHOD || isDean ? [{ href: '/gpa', label: 'GPA' }] : []),
          { href: '/approval', label: 'Approvals' },
          ...(isHOD || isDean || isExam ? [{ href: '/reports', label: 'Reports' }] : []),
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="bg-white border border-gray-200 rounded-xl p-4 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {a.label}
          </Link>
        ))}
      </div>

      {/* AI Upload Jobs */}
      {jobs.length > 0 ? (
        <Card title="Recent Upload Jobs" subtitle="AI-processed academic documents">
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{j.fileName}</span>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      j.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      j.status === 'NEEDS_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                      j.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}
                    aria-label={`Status: ${j.status}`}
                  >
                    {j.status === 'APPROVED' ? '✓ Complete' :
                     j.status === 'NEEDS_REVIEW' ? '⚠ Needs Review' :
                     j.status === 'REJECTED' ? '✕ Rejected' : j.status}
                  </span>
                  {j.status === 'NEEDS_REVIEW' && (
                    <Link href={`/review/${j.id}`} className="text-blue-600 hover:underline text-xs">
                      Review
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card title="Recent Upload Jobs">
          <p className="text-sm text-gray-500 text-center py-4">
            No AI processing jobs yet. Upload an academic document to begin.
          </p>
        </Card>
      )}

      {/* AI Processing Summary (if stats available) */}
      {stats?.aiSummary && (
        <Card title="AI Processing" className="bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-800">
            {stats.aiSummary}
          </div>
        </Card>
      )}
    </div>
  );
}