// FILE: frontend/src/hooks/useUpload.ts

'use client';

import { useState, useCallback } from 'react';
import { BulkUploadResult } from '@/types';
import { downloadBlob } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UploadState {
  isUploading: boolean;
  result: BulkUploadResult | null;
  errorFile: Blob | null;
  error: string | null;
}

interface UseUploadOptions {
  onSuccess?: (result: BulkUploadResult) => void;
  onError?: (errorFile: Blob) => void;
}

export function useUpload(
  uploadFn: (file: File) => Promise<any>,
  options: UseUploadOptions = {}
) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    result: null,
    errorFile: null,
    error: null,
  });

  const upload = useCallback(async (file: File) => {
    setState({ isUploading: true, result: null, errorFile: null, error: null });

    try {
      const response = await uploadFn(file);

      // Check if response is a Blob (error file)
      if (response instanceof Blob) {
        setState({
          isUploading: false,
          result: null,
          errorFile: response,
          error: 'Upload failed with validation errors. Download the error file for details.',
        });
        options.onError?.(response);
        return { success: false, errorFile: response };
      }

      // JSON response
      if (response.success) {
        setState({
          isUploading: false,
          result: response.data,
          errorFile: null,
          error: null,
        });
        toast.success(response.message);
        options.onSuccess?.(response.data);
        return { success: true, result: response.data };
      } else {
        setState({
          isUploading: false,
          result: null,
          errorFile: null,
          error: response.message || 'Upload failed',
        });
        toast.error(response.message);
        return { success: false, error: response.message };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Upload failed';
      setState({
        isUploading: false,
        result: null,
        errorFile: null,
        error: message,
      });
      toast.error(message);
      return { success: false, error: message };
    }
  }, [uploadFn, options]);

  const downloadErrors = useCallback(() => {
    if (state.errorFile) {
      downloadBlob(state.errorFile, 'import_errors.xlsx');
    }
  }, [state.errorFile]);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      result: null,
      errorFile: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    upload,
    downloadErrors,
    reset,
  };
}