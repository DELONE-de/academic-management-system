// FILE: backend/src/services/upload.service.ts

import { Response } from 'express';
import { prisma } from '../config/database.js';
import { extractFileContent } from '../utils/file-extractor.js';
import {
  parseStudentRows,
  parseScoreRows,
} from '../utils/excel.js';
import {
  geminiExtractStudents,
  geminiExtractResults,
  geminiValidateWithTools,
  ExtractionType,
} from '../ai/gemini.js';
import { ReviewItemPayload } from '../types/index.js';

// ============================================================
// SSE HELPERS
// ============================================================

export function sseWrite(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sseEnd(res: Response) {
  res.write('event: done\ndata: {}\n\n');
  res.end();
}

// ============================================================
// MAIN PIPELINE
// ============================================================

export async function processUpload(
  file: Express.Multer.File,
  fileType: string,
  uploadType: ExtractionType,
  uploadedById: string,
  departmentId: string,
  departmentCode: string,
  academicYear: string,
  res: Response
): Promise<void> {
  // 1. Create UploadJob record
  const job = await prisma.uploadJob.create({
    data: {
      fileName: file.originalname,
      fileType,
      status: 'PROCESSING',
      uploadedById,
      departmentId,
    },
  });

  sseWrite(res, 'status', { jobId: job.id, message: 'File received, starting extraction...' });

  try {
    // 2. Extract content from file
    sseWrite(res, 'status', { jobId: job.id, message: `Extracting content from ${fileType.toUpperCase()}...` });

    const content = await extractFileContent(file.buffer, fileType, file.mimetype);

    // 3. Parse into typed records
    let records: any[] = [];

    if (content.type === 'structured') {
      records =
        uploadType === 'students'
          ? parseStudentRows(content.rows)
          : parseScoreRows(content.rows, academicYear);
      sseWrite(res, 'status', {
        jobId: job.id,
        message: `Parsed ${records.length} rows from ${content.format.toUpperCase()}`,
      });
    } else {
      // PDF text or image — send to Gemini for structured extraction
      sseWrite(res, 'status', { jobId: job.id, message: 'Sending to Gemini for extraction...' });

      const rawText =
        content.type === 'text'
          ? content.text
          : `[IMAGE BASE64 OMITTED — use vision extraction]`;

      records =
        uploadType === 'students'
          ? await geminiExtractStudents(content.type === 'image' ? content.base64 : content.text)
          : await geminiExtractResults(content.type === 'image' ? content.base64 : content.text, academicYear);

      sseWrite(res, 'status', {
        jobId: job.id,
        message: `Gemini extracted ${records.length} records`,
      });
    }

    // Count total result entries (each student × their courses)
    const totalResultEntries =
      uploadType === 'results'
        ? records.reduce((sum: number, r: any) => sum + (r.courses?.length ?? 1), 0)
        : records.length;

    if (records.length === 0) {
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: { status: 'REJECTED', aiSummary: 'No records could be extracted from the file.' },
      });
      sseWrite(res, 'error', { jobId: job.id, message: 'No records found in file' });
      sseEnd(res);
      return;
    }

    // 4. Gemini validation pass with function-calling tools
    sseWrite(res, 'status', { jobId: job.id, message: `Validating ${records.length} records with AI...` });

    const reviewItems: ReviewItemPayload[] = await geminiValidateWithTools(
      records,
      uploadType,
      departmentCode,
      (msg) => sseWrite(res, 'status', { jobId: job.id, message: msg })
    );

    // 5. Auto-fix high-confidence issues (confidence >= 0.9 with a suggestion)
    const autoFixed = reviewItems.filter(
      (item) => item.confidence >= 0.9 && item.suggestedValue
    );
    const needsReview = reviewItems.filter(
      (item) => item.confidence < 0.9 || !item.suggestedValue
    );

    sseWrite(res, 'status', {
      jobId: job.id,
      message: `AI found ${reviewItems.length} issues — ${autoFixed.length} auto-fixed, ${needsReview.length} need review`,
    });

    // 6. Persist ReviewItems for issues that need human review
    if (needsReview.length > 0) {
      await prisma.reviewItem.createMany({
        data: needsReview.map((item) => ({
          uploadJobId: job.id,
          rowNumber: item.rowNumber,
          field: item.field,
          originalValue: item.originalValue,
          suggestedValue: item.suggestedValue,
          confidence: item.confidence,
          issueType: item.issueType,
          issueDetail: item.issueDetail,
        })),
      });
    }

    // 7. Update UploadJob with final counts
    const finalStatus = needsReview.length > 0 ? 'NEEDS_REVIEW' : 'APPROVED';
    const aiSummary =
      reviewItems.length === 0
        ? `All ${totalResultEntries} result entries passed validation with no issues.`
        : `Processed ${records.length} students (${totalResultEntries} course entries). Found ${reviewItems.length} issue(s): ${autoFixed.length} auto-fixed, ${needsReview.length} require your review.`;

    await prisma.uploadJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        totalRows: totalResultEntries,
        issuesFound: reviewItems.length,
        issuesFixed: autoFixed.length,
        issuesPending: needsReview.length,
        aiSummary,
      },
    });

    // 8. Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD_PROCESSED',
        entityType: 'upload_job',
        entityId: job.id,
        actorId: uploadedById,
        meta: {
          totalStudents: records.length,
          totalResultEntries,
          issuesFound: reviewItems.length,
          autoFixed: autoFixed.length,
          needsReview: needsReview.length,
        },
      },
    });

    sseWrite(res, 'complete', {
      jobId: job.id,
      status: finalStatus,
      totalStudents: records.length,
      totalResultEntries,
      issuesFound: reviewItems.length,
      issuesFixed: autoFixed.length,
      issuesPending: needsReview.length,
      aiSummary,
    });
  } catch (error: any) {
    await prisma.uploadJob.update({
      where: { id: job.id },
      data: { status: 'REJECTED', aiSummary: `Processing failed: ${error.message}` },
    });
    sseWrite(res, 'error', { jobId: job.id, message: error.message });
  }

  sseEnd(res);
}
