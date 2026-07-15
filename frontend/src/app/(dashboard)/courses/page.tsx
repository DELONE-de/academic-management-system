'use client';

import React, { useEffect, useState } from 'react';
import { coursesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  code: string;
  title: string;
  unit: number;
  level: string;
  semester: string;
  isElective: boolean;
}

const LEVELS = ['LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500', 'ND1', 'ND2', 'HND1', 'HND2'];
const SEMESTERS = ['FIRST', 'SECOND'];

const emptyForm = { code: '', title: '', unit: 3, level: 'LEVEL_100', semester: 'FIRST', isElective: false };

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const isHOD = user?.role === 'HOD';

  const load = async () => {
    try {
      const res = await coursesApi.getAll({ level: filterLevel || undefined, semester: filterSemester || undefined });
      setCourses((res as any).data ?? []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterLevel, filterSemester]);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (c: Course) => {
    setForm({ code: c.code, title: c.title, unit: c.unit, level: c.level, semester: c.semester, isElective: c.isElective });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim()) { toast.error('Code and title are required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await coursesApi.update(editId, form);
        toast.success('Course updated');
      } else {
        await coursesApi.create(form);
        toast.success('Course created');
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete ${code}?`)) return;
    try {
      await coursesApi.delete(id);
      toast.success('Course deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 text-sm">{courses.length} course(s) in your department</p>
        </div>
        {isHOD && (
          <Button onClick={openCreate}>+ Add Course</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
        </select>
        <select
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Semesters</option>
          {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <Card title={editId ? 'Edit Course' : 'Add Course'}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. HIM 101"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to Health Information"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Units</label>
              <input
                type="number"
                min={1}
                max={6}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isElective"
                checked={form.isElective}
                onChange={(e) => setForm({ ...form, isElective: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isElective" className="text-sm text-gray-700">Elective</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleSave} isLoading={saving}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Course table */}
      <Card>
        {loading ? (
          <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No courses found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Code', 'Title', 'Units', 'Level', 'Semester', 'Type', ...(isHOD ? ['Actions'] : [])].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.code}</td>
                    <td className="px-4 py-3 text-gray-700">{c.title}</td>
                    <td className="px-4 py-3 text-gray-600">{c.unit}</td>
                    <td className="px-4 py-3 text-gray-600">{c.level.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-gray-600">{c.semester}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.isElective ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.isElective ? 'Elective' : 'Core'}
                      </span>
                    </td>
                    {isHOD && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(c.id, c.code)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
