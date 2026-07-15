'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { studentsApi } from '@/lib/api';
import Link from 'next/link';

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await studentsApi.getAll({ departmentId: user?.departmentId, search: search || undefined, limit: 50 });
      if (r.success) setStudents(r.data || []);
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : students.length === 0 ? (
        <p className="text-gray-500 text-sm">No students found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
