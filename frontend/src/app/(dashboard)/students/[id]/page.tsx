'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { studentsApi, gpaApi, resultsApi } from '@/lib/api';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      studentsApi.getById(id),
      gpaApi.getStudentGPAHistory(id),
    ]).then(([s, g]) => {
      if (s.success) setStudent(s.data);
      if (g.success) setHistory(g.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-gray-500">Loading...</p>;
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
    </div>
  );
}
