'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { studentsApi, gpaApi } from '@/lib/api';
import Link from 'next/link';

export default function CGPAPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const r = await studentsApi.getAll({ departmentId: user?.departmentId, search: search || undefined, limit: 50 });
      if (r.success) setStudents(r.data || []);
    } finally { setLoading(false); }
  }, [user?.departmentId, search]);

  useEffect(() => { if (user) fetchStudents(); }, [user, fetchStudents]);

  const selectStudent = async (id: string) => {
    setSelected(id); setLoadingHistory(true);
    try {
      const r = await gpaApi.getStudentGPAHistory(id);
      if (r.success) setHistory(r.data);
    } finally { setLoadingHistory(false); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">CGPA Overview</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Student list */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <input type="text" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {students.map(s => (
                <button key={s.id} onClick={() => selectStudent(s.id)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                    selected === s.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                  <p className="font-medium text-gray-900">{s.lastName} {s.firstName}</p>
                  <p className="text-gray-500 text-xs">{s.matricNumber} · {s.currentLevel}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GPA detail */}
        <div className="lg:col-span-2">
          {loadingHistory ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : history ? (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-lg">{history.student.name}</p>
                  <p className="text-gray-500 text-sm">{history.student.matricNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-blue-600">{history.cgpa.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">CGPA · {history.totalUnits} units</p>
                </div>
              </div>

              {history.semesterGpas.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900 text-sm">Semester History</div>
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Level','Semester','Year','Units','GPA','CGPA'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.semesterGpas.map((g: any) => (
                        <tr key={g.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{g.level}</td>
                          <td className="px-3 py-2">{g.semester}</td>
                          <td className="px-3 py-2">{g.academicYear}</td>
                          <td className="px-3 py-2">{g.totalUnits}</td>
                          <td className="px-3 py-2 font-semibold">{g.gpa.toFixed(2)}</td>
                          <td className="px-3 py-2 font-semibold text-blue-600">{g.cumulativeGpa?.toFixed(2) ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Link href={`/students/${selected}`} className="text-sm text-blue-600 hover:underline">
                View full student details →
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
              Select a student to view their CGPA history
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
