'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { approvalApi } from '@/lib/api';
import toast from 'react-hot-toast';

const LEVELS = ['LEVEL_100','LEVEL_200','LEVEL_300','LEVEL_400','LEVEL_500','ND1','ND2','HND1','HND2'];
const YEARS = Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - i; return `${y}/${y + 1}`; });

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED_BY_EXAM_OFFICER: 'bg-indigo-100 text-indigo-700',
  APPROVED_BY_HOD: 'bg-purple-100 text-purple-700',
  APPROVED_BY_DEAN: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
};

const CAN_APPROVE: Record<string, string[]> = {
  EXAMINATION_OFFICER: ['SUBMITTED'],
  HOD: ['SUBMITTED', 'APPROVED_BY_EXAM_OFFICER'],
  DEAN: ['APPROVED_BY_HOD'],
};
const CAN_PUBLISH: Record<string, string[]> = {
  HOD: ['APPROVED_BY_HOD'],
  DEAN: ['APPROVED_BY_DEAN', 'APPROVED_BY_HOD'],
};

// Workflow stages for visual indicator
const STAGES: { key: string; label: string }[] = [
  { key: 'SUBMITTED', label: 'Lecturer' },
  { key: 'APPROVED_BY_EXAM_OFFICER', label: 'Exam Officer' },
  { key: 'APPROVED_BY_HOD', label: 'HOD' },
  { key: 'APPROVED_BY_DEAN', label: 'Dean' },
  { key: 'PUBLISHED', label: 'Published' },
];

function stageIndex(status: string): number {
  if (status === 'REJECTED') return -1;
  return STAGES.findIndex((s) => s.key === status);
}

function WorkflowIndicator({ status }: { status: string }) {
  const idx = stageIndex(status);
  if (idx === -1) {
    return (
      <div className="text-xs font-medium text-red-700" aria-label="Rejected">
        ✕ Rejected
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs" role="list" aria-label="Approval progress">
      {STAGES.map((stage, i) => {
        const done = i <= idx;
        const current = i === idx && status !== 'PUBLISHED';
        return (
          <div key={stage.key} className="flex items-center gap-1" role="listitem">
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                done
                  ? 'bg-green-100 text-green-700'
                  : current
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? '✓' : current ? '●' : '○'} {stage.label}
            </span>
            {i < STAGES.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function ApprovalPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ level: '', semester: '', academicYear: '' });

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await approvalApi.list();
      if (r.error) { setLoadError(r.error); return; }
      setBatches(r.data || []);
    } catch {
      setLoadError('Failed to load approval batches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const act = async (id: string, fn: () => Promise<any>, msg: string) => {
    setActing(id);
    try {
      const res = await fn();
      if (res.error) { toast.error(res.error); return; }
      toast.success(msg);
      await fetchBatches();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Action failed. Please try again.');
    } finally {
      setActing(null);
    }
  };

  const confirmAndApprove = (id: string) => {
    if (window.confirm('Approve this batch and advance it in the workflow?')) {
      act(id, () => approvalApi.approve(id), 'Approved');
    }
  };

  const confirmAndReject = (id: string) => {
    if (window.confirm('Reject this batch? The submitter will need to review and resubmit.')) {
      act(id, () => approvalApi.reject(id), 'Rejected');
    }
  };

  const confirmAndPublish = (id: string) => {
    if (window.confirm('Publish these results? This will make the proposed academic records official and recalculate GPA. This cannot be casually undone.')) {
      act(id, () => approvalApi.publish(id), 'Published!');
    }
  };

  const submit = async () => {
    if (!form.level || !form.semester || !form.academicYear) { toast.error('Fill all fields'); return; }
    if (!user?.departmentId) { toast.error('No department linked'); return; }
    setActing('submit');
    try {
      const res = await approvalApi.submit({ departmentId: user.departmentId, ...form } as any);
      if (res.error) { toast.error(res.error); return; }
      toast.success('Batch submitted');
      setShowForm(false);
      await fetchBatches();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to submit'); }
    finally { setActing(null); }
  };

  const role = user?.role ?? '';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Approval Workflow</h1>
        {['LECTURER','HOD','EXAMINATION_OFFICER'].includes(role) && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Submit Batch
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Submit Result Batch</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="approval-level">Level</label>
              <select id="approval-level" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="approval-semester">Semester</label>
              <select id="approval-semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                <option value="FIRST">First</option>
                <option value="SECOND">Second</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="approval-year">Academic Year</label>
              <select id="approval-year" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={acting === 'submit'}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {acting === 'submit' ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{loadError}</p>
          <button onClick={fetchBatches} className="mt-3 text-sm text-red-600 hover:underline">
            Try again
          </button>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          No approval batches yet.
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(b => {
            const canApprove = (CAN_APPROVE[role] ?? []).includes(b.status);
            const canPublish = (CAN_PUBLISH[role] ?? []).includes(b.status);
            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{b.department.name} — {b.level} {b.semester}</span>
                      <span className="text-sm text-gray-500">{b.academicYear}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      By {b.submittedBy.firstName} {b.submittedBy.lastName} · {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canApprove && (
                      <>
                        <button onClick={() => confirmAndApprove(b.id)}
                          disabled={!!acting}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                          {acting === b.id ? '...' : 'Approve'}
                        </button>
                        <button onClick={() => confirmAndReject(b.id)}
                          disabled={!!acting}
                          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                          Reject
                        </button>
                      </>
                    )}
                    {canPublish && (
                      <button onClick={() => confirmAndPublish(b.id)}
                        disabled={!!acting}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        Publish
                      </button>
                    )}
                  </div>
                </div>
                <WorkflowIndicator status={b.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}