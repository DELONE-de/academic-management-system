// FILE: frontend/src/app/(dashboard)/students/upload/page.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { UploadSummaryModal } from '@/components/modals/UploadSummaryModal';
import { useUpload } from '@/hooks/useUpload';
import { studentsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import { 
  ArrowDownTrayIcon, 
  CloudArrowUpIcon, 
  DocumentTextIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function StudentBulkUploadPage() {
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
  } = useUpload(studentsApi.bulkUpload, {
    onSuccess: () => setShowSummary(true),
    onError: () => setShowSummary(true),
  });

  if (user?.role !== 'HOD') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Only HODs can bulk import students.</p>
      </div>
    );
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await studentsApi.downloadTemplate();
      downloadBlob(blob, 'student_upload_template.xlsx');
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
        <Link href="/students" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import Students</h1>
          <p className="text-gray-500">Import multiple students from an Excel file</p>
        </div>
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
              <p className="text-sm text-gray-500">
                Download the Excel template with the correct column headers.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Fill in student data</p>
              <p className="text-sm text-gray-500">
                Add student information: MatricNumber, FirstName, LastName, DepartmentCode, AdmissionYear, StudentLevel.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Upload and validate</p>
              <p className="text-sm text-gray-500">
                Upload the file. The system will validate all rows and import valid students.
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
            label="Student Data File"
            description="Upload Excel file with student data"
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
              Upload Students
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
              <tr><td className="px-4 py-2 font-medium">FirstName</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">John</td></tr>
              <tr><td className="px-4 py-2 font-medium">LastName</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">Doe</td></tr>
              <tr><td className="px-4 py-2 font-medium">MiddleName</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2">Michael</td></tr>
              <tr><td className="px-4 py-2 font-medium">DepartmentCode</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">CSC, MTH, PHY</td></tr>
              <tr><td className="px-4 py-2 font-medium">AdmissionYear</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">2023</td></tr>
              <tr><td className="px-4 py-2 font-medium">StudentLevel</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">LEVEL_100, LEVEL_200, ND1, HND1</td></tr>
              <tr><td className="px-4 py-2 font-medium">Email</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2">john@email.com</td></tr>
              <tr><td className="px-4 py-2 font-medium">Phone</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2">08012345678</td></tr>
            </tbody>
          </table>
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
        title="Student Import Summary"
        type="students"
      />
    </div>
  );
}