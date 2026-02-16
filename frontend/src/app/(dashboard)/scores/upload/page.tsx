// FILE: frontend/src/app/(dashboard)/scores/upload/page.tsx

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { UploadSummaryModal } from '@/components/modals/UploadSummaryModal';
import { useUpload } from '@/hooks/useUpload';
import { resultsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import { 
  ArrowDownTrayIcon, 
  CloudArrowUpIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ScoreBulkUploadPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const {
    isUploading,
    result,
    errorFile,
    error,
    upload,
    downloadErrors,
    reset,
  } = useUpload(resultsApi.bulkUpload, {
    onSuccess: () => setShowSummary(true),
    onError: () => setShowSummary(true),
  });

  if (user?.role !== 'HOD') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Only HODs can bulk import scores.</p>
      </div>
    );
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await resultsApi.downloadTemplate();
      downloadBlob(blob, 'score_upload_template.xlsx');
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    await upload(file);
  };

  const handleReset = () => {
    setFile(null);
    reset();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/scores" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import Scores</h1>
          <p className="text-gray-500">Import student scores from an Excel file</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          <strong>Note:</strong> After successful import, the system automatically calculates:
        </p>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
          <li>Grade based on score</li>
          <li>Grade Point (5-point scale)</li>
          <li>Point × Unit (PXU)</li>
          <li>Carry-over status (if score &lt; department pass mark)</li>
          <li>Semester GPA and CGPA for all affected students</li>
        </ul>
      </div>

      {/* Instructions */}
      <Card title="Instructions">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Download the template</p>
              <p className="text-sm text-gray-500">Get the Excel template with correct column headers.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Fill in score data</p>
              <p className="text-sm text-gray-500">
                Add: MatricNumber, DepartmentCode, CourseCode, Score, StudentLevel, Semester, AcademicYear.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Upload and process</p>
              <p className="text-sm text-gray-500">
                System validates, imports scores, and recalculates GPA automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Download Template
          </Button>
        </div>
      </Card>

      {/* File Upload */}
      <Card title="Upload File">
        <div className="space-y-6">
          <FileUpload
            accept=".xlsx,.xls,.csv"
            maxSize={10}
            onFileSelect={setFile}
            onFileClear={handleReset}
            label="Score Data File"
            description="Upload Excel file with score data"
            disabled={isUploading}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleReset} disabled={isUploading || !file}>
              Clear
            </Button>
            <Button onClick={handleUpload} isLoading={isUploading} disabled={!file}>
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
              Upload Scores
            </Button>
          </div>
        </div>
      </Card>

      {/* Format Reference */}
      <Card title="Expected Format">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Column</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Required</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Format/Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr><td className="px-4 py-2 font-medium">MatricNumber</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">CSC/2023/001</td></tr>
              <tr><td className="px-4 py-2 font-medium">DepartmentCode</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">CSC (must match student)</td></tr>
              <tr><td className="px-4 py-2 font-medium">CourseCode</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">CSC101</td></tr>
              <tr><td className="px-4 py-2 font-medium">Score</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">0-100</td></tr>
              // FILE: frontend/src/app/(dashboard)/scores/upload/page.tsx (continued)

              <tr><td className="px-4 py-2 font-medium">StudentLevel</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">LEVEL_100, LEVEL_200, ND1, HND1</td></tr>
              <tr><td className="px-4 py-2 font-medium">Semester</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">FIRST or SECOND</td></tr>
              <tr><td className="px-4 py-2 font-medium">AcademicYear</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">2023/2024</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Course must exist in the department for the specified level and semester.
            Existing scores for the same student/course/year combination will be updated.
          </p>
        </div>
      </Card>

      {/* Summary Modal */}
      <UploadSummaryModal
        isOpen={showSummary}
        onClose={() => {
          setShowSummary(false);
          if (result?.successCount && result.successCount > 0) {
            handleReset();
          }
        }}
        result={result}
        errorFile={errorFile}
        onDownloadErrors={downloadErrors}
        title="Score Import Summary"
        type="scores"
      />
    </div>
  );
}