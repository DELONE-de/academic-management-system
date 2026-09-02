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
  geminiVisionExtract,
  ExtractionType,
} from '../ai/gemini.js';
import { validateExtractedStudents, validateExtractedResults } from '../ai/schema.js';
import { normalizeStudentRecords, normalizeResultRecords, collectNormalizationIssues, NormalizedStudent, NormalizedResult } from '../ai/normalize.js';
import { detectSuspiciousScorePattern, Anomaly } from '../ai/anomaly.js';
import { clearAIAuditLog, getAIAuditEntries, buildAISummary } from '../ai/audit.js';
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
  // Mark any stale jobs from this user as rejected before starting a new one
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.uploadJob.updateMany({
    where: { uploadedById, status: 'PROCESSING', createdAt: { lt: tenMinutesAgo } },
    data: { status: 'REJECTED', aiSummary: 'Processing timed out. Please re-upload the file.' },
  });

  // Reset AI audit trail for this upload
  clearAIAuditLog();

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

      let textContent: string;
      if (content.type === 'image') {
        textContent = await geminiVisionExtract(content.base64, content.mimeType);
      } else {
        textContent = content.text;
      }

      records =
        uploadType === 'students'
          ? await geminiExtractStudents(textContent)
          : await geminiExtractResults(textContent, academicYear);

      // Validate AI output against strict schemas — reject malformed records
      if (uploadType === 'students') {
        const validation = validateExtractedStudents(records);
        if (!validation.valid) {
          sseWrite(res, 'status', { jobId: job.id, message: `Schema validation found ${validation.errors?.length} issue(s) in AI output` });
          records = validation.data || [];
          if (records.length === 0) {
            await prisma.uploadJob.update({
              where: { id: job.id },
              data: { status: 'REJECTED', aiSummary: `AI output failed schema validation: ${validation.errors?.slice(0, 3).join('; ')}` },
            });
            sseWrite(res, 'error', { jobId: job.id, message: 'AI output failed schema validation' });
            sseEnd(res);
            return;
          }
        }
      } else {
        const validation = validateExtractedResults(records);
        if (!validation.valid) {
          sseWrite(res, 'status', { jobId: job.id, message: `Schema validation found ${validation.errors?.length} issue(s) in AI output` });
          records = validation.data || [];
          if (records.length === 0) {
            await prisma.uploadJob.update({
              where: { id: job.id },
              data: { status: 'REJECTED', aiSummary: `AI output failed schema validation: ${validation.errors?.slice(0, 3).join('; ')}` },
            });
            sseWrite(res, 'error', { jobId: job.id, message: 'AI output failed schema validation' });
            sseEnd(res);
            return;
          }
        }
      }

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

    // 3b. Normalization stage — deterministic normalization of extracted records
    sseWrite(res, 'status', { jobId: job.id, message: `Normalizing ${records.length} records...` });

    const normalizationIssues: any[] = [];
    let normalizedRecords: any[] = records;

    if (uploadType === 'students') {
      const normalized = normalizeStudentRecords(records);
      normalizationIssues.push(...collectNormalizationIssues(normalized));
      normalizedRecords = normalized;
    } else {
      const normalized = normalizeResultRecords(records);
      normalizationIssues.push(...collectNormalizationIssues(normalized));
      normalizedRecords = normalized;
    }

    if (normalizationIssues.length > 0) {
      const issueSummary = normalizationIssues.map((i) => `Row ${i.rowNumber}: ${i.field} — ${i.reason}`).join('; ');
      sseWrite(res, 'status', { jobId: job.id, message: `Normalization found ${normalizationIssues.length} issue(s): ${issueSummary.slice(0, 200)}` });
    }

    // 3c. Anomaly detection — deterministic rule-based checks
    const anomalies: Anomaly[] = [];
    if (uploadType === 'results') {
      for (const record of normalizedRecords as NormalizedResult[]) {
        const scoreAnomalies = detectSuspiciousScorePattern(record.courses);
        anomalies.push(...scoreAnomalies.map((a) => ({ ...a, rowNumber: record.rowNumber })));
      }
    }

    if (anomalies.length > 0) {
      sseWrite(res, 'status', { jobId: job.id, message: `Anomaly detection found ${anomalies.length} potential issue(s)` });
    }

    // Use normalized records for the rest of the pipeline
    records = normalizedRecords;

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

    // 5b. Convert deterministic anomalies into review items (mandatory review for high severity)
    const anomalyReviewItems: ReviewItemPayload[] = anomalies.map((a) => ({
      rowNumber: a.rowNumber,
      field: 'score',
      originalValue: String((records as any).find((r: any) => r.rowNumber === a.rowNumber)?.courses?.[0]?.score ?? ''),
      confidence: a.confidence,
      issueType: a.type === 'duplicate_result' ? 'duplicate'
        : a.type === 'score_range' || a.type === 'suspicious_score_pattern' ? 'invalid_score'
        : 'invalid_score',
      issueDetail: a.detail,
    }));

    // 6. Persist ReviewItems for issues that need human review
    const allReviewItems = [...needsReview, ...anomalyReviewItems];
    if (allReviewItems.length > 0) {
      await prisma.reviewItem.createMany({
        data: allReviewItems.map((item) => {
          // find the original record for this row so commit can reconstruct it
          const rawRecord = records.find((r: any) => r.rowNumber === item.rowNumber) ?? null;
          return {
            uploadJobId: job.id,
            rowNumber: item.rowNumber,
            field: item.field,
            originalValue: item.originalValue,
            suggestedValue: item.suggestedValue,
            confidence: item.confidence,
            issueType: item.issueType,
            issueDetail: item.issueDetail,
            rawRecord: rawRecord as any,
          };
        }),
      });
    }

    // 7. Update UploadJob with final counts
    const needsReviewTotal = allReviewItems.length;
    const finalStatus = needsReviewTotal > 0 ? 'NEEDS_REVIEW' : 'APPROVED';
    const aiSummary =
      reviewItems.length === 0 && anomalies.length === 0
        ? `All ${totalResultEntries} result entries passed validation with no issues.`
        : `Processed ${records.length} students (${totalResultEntries} course entries). Found ${reviewItems.length + anomalies.length} issue(s): ${autoFixed.length} auto-fixed, ${needsReviewTotal} require your review.`;

    // Capture AI audit trail for this upload
    const aiAudit = buildAISummary(getAIAuditEntries());

    await prisma.uploadJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        totalRows: totalResultEntries,
        issuesFound: reviewItems.length + anomalies.length,
        issuesFixed: autoFixed.length,
        issuesPending: needsReviewTotal,
        aiSummary,
        rawRecords: records as any,
        academicYear,
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
          issuesFound: reviewItems.length + anomalies.length,
          autoFixed: autoFixed.length,
          needsReview: needsReviewTotal,
          normalizationIssues: normalizationIssues.length,
          anomalies: anomalies.length,
          ai: aiAudit,
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
