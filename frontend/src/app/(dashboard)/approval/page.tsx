// FILE: frontend/src/app/(dashboard)/approval/page.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { approvalApi, departmentsApi } from '@/lib/api';
import { formatLevel, formatSemester, LEVELS, SEMESTERS, generateAcademicYears, cn } from '@/lib/utils';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT:                   { label: 'Draft',              color: 'bg-gray-100 text-gray-600' },
  SUBMITTED:               { label: 'Submitted',          color: 'bg-blue-100 text-blue-700' },
  APPROVED_BY_EXAM_OFFICER:{ label: 'Exam Officer ✓',     color: 'bg-indigo-100 text-indigo-700' },
  APPROVED_BY_HOD:         { label: 'HOD ✓',              color: 'bg-purple-100 text-purple-700' },
  APPROVED_BY_DEAN:        { label: 'Dean ✓',             color: 'bg-green-100 text-green-700' },
  REJECTED:                { label: 'Rejected',           color: 'bg-red-100 text-red-700' },
  PUBLISHED:               { label: 'Published',          color: 'bg-emerald-100 text-emerald-700' },
};

// Which statuses each role can act on
const CAN_APPROVE: Record<string, string[]> = {
  EXAMINATION_OFFICER: ['SUBMITTED'],
  HOD:                 ['SUBMITTED', 'APPROVED_BY_EXAM_OFFICER'],
  DEAN:                ['APPROVED_BY_HOD'],
};
const CAN_PUBLISH: Record<string, string[]> = {
  HOD:  ['APPROVED_BY_HOD'],
  DEAN: ['APPROVED_BY_DEAN', 'APPROVED_BY_HOD'],
};

export default function ApprovalPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({ departmentId: user?.departmentId ?? '', level: '', semester: '', academicYear: '' });
  const [comment, setComment] = useState('');

  const fetchBatches = useCallback(async () => {
    try {
      const res = await approvalApi.list();
      setBatches(res.data);
    } catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchBatches();
    if (user?.role === 'DEAN') {
      departmentsApi.getAll().then((r) => r.success && setDepartments(r.data));
    }
  }, [fetchBatches, user]);

  const act = async (fn: () => Promise<any>, successMsg: string) => {
    try { await fn(); toast.success(successMsg); await fetchBatches(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Action failed'); }
    finally { setActing(null); }
  };

  const handleSubmit = async () => {
    if (!form.departmentId || !form.level || !form.semester || !form.academicYear) {
      toast.error('Fill in all fields'); return;
    }
    setActing('submit');
    await act(() => approvalApi.submit(form as any), 'Batch submitted for approval');
    setShowSubmit(false);
  };

  const role = user?.role ?? '';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Workflow</h1>
          <p className="text-gray-500 text-sm">Lecturer → Exam Officer → HOD → Dean → Published</p>
        </div>
        {['LECTURER', 'HOD', 'EXAMINATION_OFFICER'].includes(role) && (
          <Button onClick={() => setShowSubmit(true)}>
            <PlusIcon className="h-4 w-4 mr-1" /> Submit Batch
          </Button>
        )}
      </div>

      {/* Submit form */}
      {showSubmit && (
        <Card title="Submit Result Batch">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {role === 'DEAN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Select</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="">Select</option>
                {LEVELS.map((l) => <option key={l} value={l}>{formatLevel(l)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                <option value="">Select</option>
                {SEMESTERS.map((s) => <option key={s} value={s}>{formatSemester(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
                <option value="">Select</option>
                {generateAcademicYears().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={acting === 'submit'}>Submit</Button>
          </div>
        </Card>
      )}

      {/* Batch list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Loading...</div>
      ) : batches.length === 0 ? (
        <Card><div className="text-center py-12 text-gray-400">No result batches yet.</div></Card>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const s = STATUS_LABEL[batch.status] ?? { label: batch.status, color: 'bg-gray-100 text-gray-600' };
            const canApprove = (CAN_APPROVE[role] ?? []).includes(batch.status);
            const canPublish = (CAN_PUBLISH[role] ?? []).includes(batch.status);
            const canReject = canApprove;

            return (
              <Card key={batch.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {batch.department.name} — {formatLevel(batch.level)} {formatSemester(batch.semester)}
                      </span>
                      <span className="text-sm text-gray-500">{batch.academicYear}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.color)}>{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Submitted by {batch.submittedBy.firstName} {batch.submittedBy.lastName} ·{' '}
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </p>

                    {/* Approval chain trail */}
                    {batch.approvals.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {batch.approvals.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-1 text-xs text-gray-500">
                            {a.status === 'REJECTED' ? (
                              <XCircleIcon className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                            )}
                            {a.approver.firstName} ({a.approver.role})
                            {a.comment && <span className="italic">"{a.comment}"</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {canApprove && (
                      <>
                        <input
                          type="text"
                          placeholder="Comment (optional)"
                          value={acting === batch.id ? comment : ''}
                          onChange={(e) => setComment(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-36 hidden md:block"
                        />
                        <Button size="sm" variant="success"
                          isLoading={acting === `approve-${batch.id}`}
                          onClick={() => { setActing(`approve-${batch.id}`); act(() => approvalApi.approve(batch.id, comment), 'Approved'); }}>
                          <CheckCircleIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger"
                          isLoading={acting === `reject-${batch.id}`}
                          onClick={() => { setActing(`reject-${batch.id}`); act(() => approvalApi.reject(batch.id, comment), 'Rejected'); }}>
                          <XCircleIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canPublish && (
                      <Button size="sm" variant="primary"
                        isLoading={acting === `publish-${batch.id}`}
                        onClick={() => { setActing(`publish-${batch.id}`); act(() => approvalApi.publish(batch.id), 'Published!'); }}>
                        <MegaphoneIcon className="h-4 w-4 mr-1" /> Publish
                      </Button>
                    )}
                    {!canApprove && !canPublish && batch.status !== 'PUBLISHED' && batch.status !== 'REJECTED' && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <ClockIcon className="h-4 w-4" /> Awaiting action
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
