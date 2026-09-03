'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { studentsApi, gpaApi, resultsApi } from '@/lib/api';
import { ResultStatusBadge } from '@/components/ui/ResultStatusBadge';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      studentsApi.getById(id),
      gpaApi.getStudentGPAHistory(id),
      resultsApi.getStudentResults(id),
    ]).then(([s, g, r]) => {
      if (s.data) setStudent(s.data);
      if (s.error) setError(s.error);
      if (g.data) setHistory(g.data);
      if (r.data) setResults(r.data);
    }).catch(() => setError('Failed to load student details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!student) return <p className="p-6 text-gray-500">Student not found.</p>;

  return (
    <div className="space-y-6 p-6">
      <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">← Back</button>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-bold text-gray-900">{student.lastName} {student.firstName}</h1>
        <p className="text-gray-500">{student.matricNumber} · {student.currentLevel} · {student.admissionYear}</p>
        {history && (
          <p className="mt-3 text-2xl font-bold text-blue-600">CGPA: {history.cgpa?.toFixed(2)}</p>
        )}
      </div>

      {history?.semesterGpas?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">Semester GPA History</div>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Level', 'Semester', 'Year', 'Units', 'GPA', 'CGPA'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.semesterGpas.map((g: any) => (
                <tr key={g.id}>
                  <td className="px-4 py-2">{g.level}</td>
                  <td className="px-4 py-2">{g.semester}</td>
                  <td className="px-4 py-2">{g.academicYear}</td>
                  <td className="px-4 py-2">{g.totalUnits}</td>
                  <td className="px-4 py-2 font-semibold">{g.gpa.toFixed(2)}</td>
                  <td className="px-4 py-2 font-semibold text-blue-600">{g.cumulativeGpa?.toFixed(2) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-gray-900">Course Results</span>
            <span className="text-xs text-gray-500">Official results count toward GPA</span>
          </div>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Course', 'Title', 'Score', 'Grade', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{r.course?.code}</td>
                  <td className="px-4 py-2">{r.course?.title}</td>
                  <td className="px-4 py-2">{r.score}</td>
                  <td className="px-4 py-2">{r.grade}</td>
                  <td className="px-4 py-2"><ResultStatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
          No academic results are available yet.
        </div>
      )}
    </div>
  );
}