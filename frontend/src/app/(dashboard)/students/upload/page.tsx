'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { uploadApi, studentsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import {
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface RecoverableJob {
  id: string;
  fileName: string;
  status: string;
  aiSummary: string | null;
  issuesPending: number;
  createdAt: string;
}

interface UploadResult {
  jobId: string;
  status: string;
  totalStudents: number;
  issuesFound: number;
  issuesFixed: number;
  issuesPending: number;
  aiSummary: string;
}

export default function StudentBulkUploadPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recoverableJobs, setRecoverableJobs] = useState<RecoverableJob[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    uploadApi.getJobs().then((jobs) => {
      setRecoverableJobs(
        jobs.filter((j) => j.status === 'NEEDS_REVIEW' || j.status === 'REJECTED')
      );
    }).catch(() => {});
  }, []);

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
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a file'); return; }

    setIsUploading(true);
    setStatusMessages([]);
    setResult(null);
    setUploadError(null);
    abortRef.current = new AbortController();

    try {
      const response = await uploadApi.streamUpload(file, 'students', '');

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            lastEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              if (data.message) setStatusMessages((prev) => [...prev, data.message]);
              if (lastEvent === 'complete') setResult(data);
              if (lastEvent === 'error') throw new Error(data.message || 'Processing failed');
            } catch (parseErr: any) {
              if (lastEvent === 'error') throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatusMessages([]);
    setResult(null);
    setUploadError(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Link href="/students" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Student Upload</h1>
          <p className="text-gray-500">Upload a student list — AI extracts, validates, and flags issues for review</p>
        </div>
      </div>

      {/* Recoverable jobs banner */}
      {recoverableJobs.length > 0 && (
        <div className="space-y-2">
          {recoverableJobs.map((job) => (
            <div
              key={job.id}
              className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${
                job.status === 'REJECTED'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {job.status === 'REJECTED' ? (
                  <ArrowPathIcon className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{job.fileName}</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    {job.status === 'REJECTED'
                      ? job.aiSummary ?? 'Processing was interrupted. Please re-upload.'
                      : `${job.issuesPending} item(s) still need your review.`}
                  </p>
                </div>
              </div>
              {job.status === 'NEEDS_REVIEW' && (
                <Link href={`/review/${job.id}`} className="shrink-0">
                  <Button size="sm" variant="outline">Resume Review</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      <Card title="Upload File">
        <div className="space-y-4">
          <FileUpload
            accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp"
            maxSize={20}
            onFileSelect={setFile}
            onFileClear={handleReset}
            label="Student Data File"
            description="Excel, CSV, PDF, or image of a printed student list"
            disabled={isUploading}
          />

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {uploadError}
            </div>
          )}

          {statusMessages.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {statusMessages.map((msg, i) => (
                <p key={i} className="text-xs text-gray-600">{msg}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleReset} disabled={isUploading || !file}>
              Clear
            </Button>
            <Button onClick={handleUpload} isLoading={isUploading} disabled={!file}>
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
              Upload & Process
            </Button>
          </div>
        </div>
      </Card>

      {/* Result summary */}
      {result && (
        <Card title="Processing Complete">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.issuesPending > 0 ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
              <p className="text-sm text-gray-700">{result.aiSummary}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{result.totalStudents}</p>
                <p className="text-xs text-gray-500">Students</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{result.issuesFixed}</p>
                <p className="text-xs text-gray-500">Auto-fixed</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-yellow-700">{result.issuesPending}</p>
                <p className="text-xs text-gray-500">Need review</p>
              </div>
            </div>
            {result.issuesPending > 0 && (
              <div className="flex justify-end">
                <Link href={`/review/${result.jobId}`}>
                  <Button>Go to Review Center</Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Format reference */}
      <Card title="Expected File Format">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Column</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Required</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Format / Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr><td className="px-4 py-2 font-medium">MatricNumber</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">HIM/2024/0001</td></tr>
              <tr><td className="px-4 py-2 font-medium">FirstName</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">John</td></tr>
              <tr><td className="px-4 py-2 font-medium">LastName</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">Doe</td></tr>
              <tr><td className="px-4 py-2 font-medium">MiddleName</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2">Michael</td></tr>
              <tr><td className="px-4 py-2 font-medium">DepartmentCode</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">HIM, ITH, OPT</td></tr>
              <tr><td className="px-4 py-2 font-medium">AdmissionYear</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">2024</td></tr>
              <tr><td className="px-4 py-2 font-medium">StudentLevel</td><td className="px-4 py-2 text-green-600">Yes</td><td className="px-4 py-2">LEVEL_100, LEVEL_200, ND1, HND1</td></tr>
              <tr><td className="px-4 py-2 font-medium">Email</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2">john@email.com</td></tr>
              <tr><td className="px-4 py-2 font-medium">Phone</td><td className="px-4 py-2 text-gray-400">No</td><td className="px-4 py-2">08012345678</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Download Template
          </Button>
        </div>
      </Card>
    </div>
  );
}
