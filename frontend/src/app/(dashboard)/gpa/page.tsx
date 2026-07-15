'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { gpaApi } from '@/lib/api';

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return `${y}/${y + 1}`;
});

const LEVELS = ['LEVEL_100','LEVEL_200','LEVEL_300','LEVEL_400','LEVEL_500','ND1','ND2','HND1','HND2'];

export default function GPAPage() {
  const { user } = useAuth();
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    if (!user?.departmentId) { setError('No department linked to your account'); return; }
    setLoading(true); setError('');
    try {
      const r = await gpaApi.getDepartmentStats(user.departmentId, {
        level: level || undefined,
        semester: semester || undefined,
        academicYear: year || undefined,
      });
      if (r.success) setStats(r.data);
    } catch { setError('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const bands = stats ? [
    { label: 'First Class (≥4.5)', value: stats.distribution?.firstClass ?? 0, color: 'bg-green-500' },
    { label: '2nd Upper (≥3.5)', value: stats.distribution?.secondUpper ?? 0, color: 'bg-blue-500' },
    { label: '2nd Lower (≥2.4)', value: stats.distribution?.secondLower ?? 0, color: 'bg-yellow-500' },
    { label: 'Third Class (≥1.5)', value: stats.distribution?.thirdClass ?? 0, color: 'bg-orange-500' },
    { label: 'Pass (≥1.0)', value: stats.distribution?.pass ?? 0, color: 'bg-purple-500' },
    { label: 'Fail (<1.0)', value: stats.distribution?.fail ?? 0, color: 'bg-red-500' },
  ] : [];
  const total = bands.reduce((s, b) => s + b.value, 0);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">GPA Statistics</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
          <select value={level} onChange={e => setLevel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="FIRST">First</option>
            <option value="SECOND">Second</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={fetch} disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'View Stats'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', value: stats.count },
              { label: 'Highest GPA', value: stats.highestGpa?.value?.toFixed(2) ?? 'N/A' },
              { label: 'Lowest GPA', value: stats.lowestGpa?.value?.toFixed(2) ?? 'N/A' },
              { label: 'Average GPA', value: stats.averageGpa?.toFixed(2) ?? 'N/A' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Class Distribution</h2>
            {bands.map(b => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{b.label}</span>
                  <span className="font-medium">{b.value} ({total > 0 ? ((b.value / total) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${b.color}`} style={{ width: `${total > 0 ? (b.value / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
