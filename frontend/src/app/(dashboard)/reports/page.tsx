'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { reportsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import toast from 'react-hot-toast';

const LEVELS = ['LEVEL_100','LEVEL_200','LEVEL_300','LEVEL_400','LEVEL_500','ND1','ND2','HND1','HND2'];
const YEARS = Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - i; return `${y}/${y + 1}`; });

export default function ReportsPage() {
  const { user } = useAuth();
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const generate = async () => {
    if (!user?.departmentId || !level || !semester || !year) { toast.error('Fill all fields'); return; }
    setLoading(true);
    try {
      const r = await reportsApi.getDepartmentReport(user.departmentId, { level, semester, academicYear: year });
      if (r.success) setReport(r.data);
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const download = async () => {
    if (!user?.departmentId) return;
    setDownloading(true);
    try {
      const blob = await reportsApi.downloadDepartmentReportPDF(user.departmentId, { level, semester, academicYear: year });
      downloadBlob(blob, `report-${level}-${semester}-${year.replace('/', '-')}.pdf`);
      toast.success('Downloaded');
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
          <select value={level} onChange={e => setLevel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select</option>
            <option value="FIRST">First</option>
            <option value="SECOND">Second</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'Generate'}
        </button>
        {report && (
          <button onClick={download} disabled={downloading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        )}
      </div>

      {report && (
        <>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Students', value: report.stats.totalStudents },
              { label: 'Highest GPA', value: report.stats.highestGpa?.toFixed(2) },
              { label: 'Lowest GPA', value: report.stats.lowestGpa?.toFixed(2) },
              { label: 'Average GPA', value: report.stats.averageGpa?.toFixed(2) },
              { label: 'Carry-overs', value: report.stats.carryOverCount },
              { label: 'Pass Rate', value: `${report.stats.passRate?.toFixed(1)}%` },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
              {report.department?.name} — {level} {semester} {year}
            </div>
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#','Matric No.','Name','GPA','CGPA','Carry-overs'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.students?.map((s: any, i: number) => (
                  <tr key={s.studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{s.matricNumber}</td>
                    <td className="px-4 py-2">{s.studentName}</td>
                    <td className="px-4 py-2 font-semibold">{s.gpa?.toFixed(2)}</td>
                    <td className="px-4 py-2 font-semibold text-blue-600">{s.cgpa?.toFixed(2) ?? '-'}</td>
                    <td className="px-4 py-2">{s.results?.filter((r: any) => r.isCarryOver).length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
