'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { studentsApi } from '@/lib/api';
import Link from 'next/link';

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await studentsApi.getAll({ departmentId: user?.departmentId, search: search || undefined, limit: 50 });
      if (r.data) setStudents(r.data);
      if (r.error) setError(r.error);
    } catch {
      setError('Failed to load students');
    } finally { setLoading(false); }
  }, [user?.departmentId, search]);

  useEffect(() => { if (user) fetch(); }, [user, fetch]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <Link href="/students/upload" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Bulk Import
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by name or matric..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label="Search students"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={fetch} className="mt-3 text-sm text-red-600 hover:underline">
            Try again
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
          No students found. Try changing the search.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Matric No.', 'Name', 'Level', 'Admission Year', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.matricNumber}</td>
                  <td className="px-4 py-3">{s.lastName} {s.firstName}</td>
                  <td className="px-4 py-3">{s.currentLevel}</td>
                  <td className="px-4 py-3">{s.admissionYear}</td>
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}