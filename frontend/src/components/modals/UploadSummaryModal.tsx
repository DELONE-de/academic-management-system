// FILE: frontend/src/components/modals/UploadSummaryModal.tsx

'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { BulkUploadResult } from '@/types';
import { CheckCircleIcon, ExclamationCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface UploadSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BulkUploadResult | null;
  errorFile: Blob | null;
  onDownloadErrors: () => void;
  title?: string;
  type: 'students' | 'scores';
}

export function UploadSummaryModal({
  isOpen,
  onClose,
  result,
  errorFile,
  onDownloadErrors,
  title = 'Upload Summary',
  type,
}: UploadSummaryModalProps) {
  const isSuccess = result && result.errorCount === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {isSuccess ? (
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircleIcon className="h-16 w-16 text-green-600" />
            </div>
          ) : (
            <div className="rounded-full bg-red-100 p-4">
              <ExclamationCircleIcon className="h-16 w-16 text-red-600" />
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
              <p className="text-sm text-gray-500">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
              <p className="text-sm text-gray-500">
                {type === 'scores' ? 'New Scores' : 'Imported'}
              </p>
            </div>
            {type === 'scores' && result.updatedCount !== undefined && (
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.updatedCount}</p>
                <p className="text-sm text-gray-500">Updated</p>
              </div>
            )}
            {type === 'students' && result.skippedCount !== undefined && (
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{result.skippedCount}</p>
                <p className="text-sm text-gray-500">Skipped</p>
              </div>
            )}
            <div className={cn(
              'rounded-lg p-4 text-center',
              result.errorCount > 0 ? 'bg-red-50' : 'bg-gray-50'
            )}>
              <p className={cn(
                'text-2xl font-bold',
                result.errorCount > 0 ? 'text-red-600' : 'text-gray-400'
              )}>
                {result.errorCount}
              </p>
              <p className="text-sm text-gray-500">Errors</p>
            </div>
          </div>
        )}

        {/* Additional Info */}
        {type === 'scores' && result?.affectedStudents !== undefined && (
          <div className="bg-primary-50 rounded-lg p-4 text-center">
            <p className="text-lg font-semibold text-primary-700">
              GPA recalculated for {result.affectedStudents} student(s)
            </p>
          </div>
        )}

        {/* Error Download */}
        {errorFile && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-800">Validation Errors Found</p>
                <p className="text-sm text-red-600">
                  Download the error file to see details and fix the issues.
                </p>
              </div>
              <Button variant="danger" onClick={onDownloadErrors}>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download Errors
              </Button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-medium">
              {type === 'students' 
                ? 'All students imported successfully!' 
                : 'All scores imported and GPA calculated successfully!'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}