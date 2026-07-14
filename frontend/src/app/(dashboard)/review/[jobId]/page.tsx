// FILE: frontend/src/app/(dashboard)/review/[jobId]/page.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { reviewApi } from '@/lib/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ReviewItem {
  id: string;
  rowNumber: number;
  field: string;
  originalValue: string | null;
  suggestedValue: string | null;
  confidence: number;
  issueType: string;
  issueDetail: string;
  isResolved: boolean;
  resolution: string | null;
}

interface UploadJob {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  issuesFound: number;
  issuesFixed: number;
  issuesPending: number;
  aiSummary: string | null;
  uploadedBy: { firstName: string; lastName: string };
  reviewItems: ReviewItem[];
}

const ISSUE_LABELS: Record<string, string> = {
  duplicate: 'Duplicate',
  invalid_score: 'Invalid Score',
  missing_student: 'Missing Student',
  wrong_course: 'Wrong Course',
  unregistered: 'Not Registered',
};

const ISSUE_COLORS: Record<string, string> = {
  duplicate: 'bg-orange-100 text-orange-700',
  invalid_score: 'bg-red-100 text-red-700',
  missing_student: 'bg-red-100 text-red-700',
  wrong_course: 'bg-yellow-100 text-yellow-700',
  unregistered: 'bg-purple-100 text-purple-700',
};

export default function ReviewCenterPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<UploadJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await reviewApi.getJob(jobId);
      setJob(res.data);
    } catch {
      toast.error('Failed to load review items');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const resolve = async (itemId: string, resolution: 'accepted' | 'rejected' | 'edited', correctedValue?: string) => {
    setResolving(itemId);
    try {
      await reviewApi.resolveItem(itemId, resolution, correctedValue);
      setEditingId(null);
      await fetchJob();
      toast.success(resolution === 'accepted' ? 'Accepted' : resolution === 'rejected' ? 'Rejected' : 'Edited & saved');
    } catch {
      toast.error('Failed to resolve item');
    } finally {
      setResolving(null);
    }
  };

  const approveAll = async () => {
    setApprovingAll(true);
    try {
      const res = await reviewApi.approveAll(jobId);
      await fetchJob();
      toast.success(res.message);
    } catch {
      toast.error('Failed to approve all');
    } finally {
      setApprovingAll(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading review items...</div>;
  }

  if (!job) {
    return <div className="text-center py-12 text-gray-500">Upload job not found.</div>;
  }

  const pending = job.reviewItems.filter((i) => !i.isResolved);
  const resolved = job.reviewItems.filter((i) => i.isResolved);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/scores/upload" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Review Center</h1>
          <p className="text-gray-500 text-sm">{job.fileName} · uploaded by {job.uploadedBy.firstName} {job.uploadedBy.lastName}</p>
        </div>
        {pending.length > 0 && (
          <Button onClick={approveAll} isLoading={approvingAll} variant="success">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Accept All ({pending.length})
          </Button>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total entries', value: job.totalRows, color: 'text-gray-900' },
          { label: 'Issues found', value: job.issuesFound, color: 'text-red-600' },
          { label: 'Auto-fixed', value: job.issuesFixed, color: 'text-green-600' },
          { label: 'Pending review', value: job.issuesPending, color: 'text-yellow-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {job.aiSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          {job.aiSummary}
        </div>
      )}

      {/* Pending items */}
      {pending.length > 0 && (
        <Card
          title={`Needs Review (${pending.length})`}
          subtitle="Accept the AI suggestion, reject it, or correct the value manually"
        >
          <div className="divide-y divide-gray-100">
            {pending.map((item) => (
              <div key={item.id} className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-500">Row {item.rowNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ISSUE_COLORS[item.issueType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ISSUE_LABELS[item.issueType] ?? item.issueType}
                      </span>
                      <span className="text-xs text-gray-400">field: {item.field}</span>
                      <span className="text-xs text-gray-400">confidence: {Math.round(item.confidence * 100)}%</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{item.issueDetail}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {item.originalValue && (
                        <span className="text-red-600 line-through">{item.originalValue}</span>
                      )}
                      {item.suggestedValue && (
                        <span className="text-green-700 font-medium">→ {item.suggestedValue}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Corrected value"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!editValue.trim() || resolving === item.id}
                        isLoading={resolving === item.id}
                        onClick={() => resolve(item.id, 'edited', editValue.trim())}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="success"
                        disabled={!!resolving}
                        isLoading={resolving === item.id}
                        onClick={() => resolve(item.id, 'accepted')}
                        title="Accept AI suggestion"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!resolving}
                        onClick={() => { setEditingId(item.id); setEditValue(item.suggestedValue ?? ''); }}
                        title="Edit manually"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={!!resolving}
                        isLoading={resolving === item.id}
                        onClick={() => resolve(item.id, 'rejected')}
                        title="Reject — keep original"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All resolved */}
      {pending.length === 0 && job.issuesFound > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircleIcon className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">All issues resolved</p>
          <p className="text-sm text-green-600 mt-1">This upload is ready to proceed to the approval workflow.</p>
        </div>
      )}

      {/* No issues at all */}
      {job.issuesFound === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircleIcon className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">No issues found</p>
          <p className="text-sm text-green-600 mt-1">AI validation passed all records cleanly.</p>
        </div>
      )}

      {/* Resolved items (collapsed) */}
      {resolved.length > 0 && (
        <Card title={`Resolved (${resolved.length})`}>
          <div className="divide-y divide-gray-100">
            {resolved.map((item) => (
              <div key={item.id} className="py-3 flex items-center gap-3 text-sm text-gray-500">
                {item.resolution === 'rejected' ? (
                  <XCircleIcon className="h-4 w-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" />
                )}
                <span>Row {item.rowNumber} · {item.field}</span>
                <span className="text-gray-400">·</span>
                <span>{item.issueDetail}</span>
                <span className="ml-auto capitalize text-xs font-medium">{item.resolution}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
