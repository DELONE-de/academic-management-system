'use client';

import { useState } from 'react';

const LEVELS = ['ND1', 'ND2', 'HND1', 'HND2', 'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'];

export default function BulkLevelUpdate({ students, onSuccess }: { students: any[]; onSuccess: () => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newLevel, setNewLevel] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(prev => 
      prev.length === students.length ? [] : students.map(s => s.id)
    );
  };

  const handleSubmit = async () => {
    if (!newLevel || selectedIds.length === 0) {
      alert('Select students and new level');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/students/bulk-update-level', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedIds, newLevel }),
      });

      if (!res.ok) throw new Error('Failed to update');

      alert(`Updated ${selectedIds.length} students`);
      setSelectedIds([]);
      setNewLevel('');
      onSuccess();
    } catch (error) {
      alert('Failed to update students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Select new level</option>
          {LEVELS.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        <button onClick={handleSubmit} disabled={loading || !newLevel || selectedIds.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          Update {selectedIds.length} Student{selectedIds.length !== 1 ? 's' : ''}
        </button>
      </div>

      <div className="border rounded-lg">
        <div className="p-4 border-b flex items-center gap-2">
          <input type="checkbox" checked={selectedIds.length === students.length} onChange={toggleAll} />
          <span className="font-medium">Select All ({students.length})</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {students.map(student => (
            <div key={student.id} className="p-3 border-b flex items-center gap-3 hover:bg-gray-50">
              <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />
              <div className="flex-1">
                <div className="font-medium">{student.matricNumber}</div>
                <div className="text-sm text-gray-600">{student.firstName} {student.lastName}</div>
              </div>
              <div className="text-sm text-gray-500">Current: {student.currentLevel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
