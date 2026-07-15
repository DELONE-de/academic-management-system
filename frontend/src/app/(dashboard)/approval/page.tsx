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

export default function ApprovalPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ level: '', semester: '', academicYear: '' });

  const fetchBatches = useCallback(async () => {
    try {
      const r = await approvalApi.list();
      setBatches(r.data || []);
    } catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const act = async (id: string, fn: () => Promise<any>, msg: string) => {
    setActing(id);
    try { await fn(); toast.success(msg); await fetchBatches(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed'); }
    finally { setActing(null); }
  };

  const submit = async () => {
    if (!form.level || !form.semester || !form.academicYear) { toast.error('Fill all fields'); return; }
    if (!user?.departmentId) { toast.error('No department linked'); return; }
    setActing('submit');
    try {
      await approvalApi.submit({ departmentId: user.departmentId, ...form } as any);
      toast.success('Batch submitted');
      setShowForm(false);
      await fetchBatches();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed'); }
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
              <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                <option value="FIRST">First</option>
                <option value="SECOND">Second</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <select value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })}
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

      {loading ? <p className="text-gray-500 text-sm">Loading...</p> : batches.length === 0 ? (
        <p className="text-gray-500 text-sm">No batches yet.</p>
      ) : (
        <div className="space-y-3">
          {batches.map(b => {
            const canApprove = (CAN_APPROVE[role] ?? []).includes(b.status);
            const canPublish = (CAN_PUBLISH[role] ?? []).includes(b.status);
            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
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
                      <button onClick={() => act(b.id, () => approvalApi.approve(b.id), 'Approved')}
                        disabled={!!acting}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {acting === b.id ? '...' : 'Approve'}
                      </button>
                      <button onClick={() => act(b.id, () => approvalApi.reject(b.id), 'Rejected')}
                        disabled={!!acting}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                        Reject
                      </button>
                    </>
                  )}
                  {canPublish && (
                    <button onClick={() => act(b.id, () => approvalApi.publish(b.id), 'Published!')}
                      disabled={!!acting}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      Publish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
