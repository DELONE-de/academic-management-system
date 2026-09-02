// src/__tests__/ai-provider.test.ts
// Targeted tests for the OpenRouter → Gemini → Groq routing layer.
// Uses mocked provider modules — never makes live AI API calls.

jest.mock('../ai/openrouter.js', () => ({
  openrouterExtractStudents: jest.fn(),
  openrouterExtractResults: jest.fn(),
  openrouterValidateWithTools: jest.fn(),
  openrouterExplainGPA: jest.fn(),
  openrouterVisionExtract: jest.fn(),
}));

jest.mock('../ai/gemini.js', () => ({
  geminiExtractStudents: jest.fn(),
  geminiExtractResults: jest.fn(),
  geminiValidateWithTools: jest.fn(),
  geminiExplainGPA: jest.fn(),
  geminiVisionExtract: jest.fn(),
}));

jest.mock('../ai/groq.js', () => ({
  groqExtractStudents: jest.fn(),
  groqExtractResults: jest.fn(),
  groqValidateWithTools: jest.fn(),
  groqExplainGPA: jest.fn(),
}));

import {
  aiExtractStudents,
  aiExtractResults,
  aiExplainGPA,
  aiVisionExtract,
  aiValidateWithTools,
} from '../ai/ai.service.js';
import { buildAISummary, getAIAuditEntries, clearAIAuditLog } from '../ai/audit.js';
import * as openrouter from '../ai/openrouter.js';
import * as gemini from '../ai/gemini.js';
import * as groq from '../ai/groq.js';

const mockOpenrouter = openrouter as jest.Mocked<typeof openrouter>;
const mockGemini = gemini as jest.Mocked<typeof gemini>;
const mockGroq = groq as jest.Mocked<typeof groq>;

const sampleStudent = {
  rowNumber: 1,
  matricNumber: 'CSC/2024/001',
  firstName: 'John',
  lastName: 'Doe',
  departmentCode: 'CSC',
  admissionYear: 2024,
  studentLevel: 'LEVEL_100',
  confidence: 1.0,
};

const sampleResult = {
  rowNumber: 1,
  matricNumber: '2024/5337',
  academicYear: '2024/2025',
  courses: [{ courseCode: 'CSC 101', score: 75, confidence: 1.0 }],
  overallConfidence: 1.0,
};

const explainData = {
  studentName: 'John Doe',
  gpa: 3.5,
  results: [],
  totalUnits: 0,
  totalPoints: 0,
};

describe('AI provider routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAIAuditLog();
    // Ensure all three providers are "configured" so routing can reach each
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.AI_PROVIDER = 'openrouter';
  });

  describe('extraction routing', () => {
    it('Gemma succeeds → no fallback, provider is openrouter', async () => {
      mockOpenrouter.openrouterExtractStudents.mockResolvedValue([sampleStudent]);

      const result = await aiExtractStudents('content');

      expect(result.meta.provider).toBe('openrouter');
      expect(result.meta.fallbackUsed).toBe(false);
      expect(mockGemini.geminiExtractStudents).not.toHaveBeenCalled();
      expect(mockGroq.groqExtractStudents).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('Gemma fails → Gemini succeeds → fallbackUsed true', async () => {
      mockOpenrouter.openrouterExtractStudents.mockRejectedValue(new Error('network'));
      mockGemini.geminiExtractStudents.mockResolvedValue([sampleStudent]);

      const result = await aiExtractStudents('content');

      expect(result.meta.provider).toBe('gemini');
      expect(result.meta.fallbackUsed).toBe(true);
      expect(mockGroq.groqExtractStudents).not.toHaveBeenCalled();
    });

    it('Gemma + Gemini fail → Groq succeeds → fallbackUsed true', async () => {
      mockOpenrouter.openrouterExtractStudents.mockRejectedValue(new Error('timeout'));
      mockGemini.geminiExtractStudents.mockRejectedValue(new Error('quota-ish'));
      mockGroq.groqExtractStudents.mockResolvedValue([sampleStudent]);

      const result = await aiExtractStudents('content');

      expect(result.meta.provider).toBe('groq');
      expect(result.meta.fallbackUsed).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('all providers fail → empty result, no infinite loop', async () => {
      mockOpenrouter.openrouterExtractStudents.mockRejectedValue(new Error('a'));
      mockGemini.geminiExtractStudents.mockRejectedValue(new Error('b'));
      mockGroq.groqExtractStudents.mockRejectedValue(new Error('c'));

      const result = await aiExtractStudents('content');

      expect(result.data).toEqual([]);
      // No fallback "succeeded" — routing reports the answering provider but not success
      expect(mockOpenrouter.openrouterExtractStudents).toHaveBeenCalledTimes(1);
      expect(mockGemini.geminiExtractStudents).toHaveBeenCalledTimes(1);
      expect(mockGroq.groqExtractStudents).toHaveBeenCalledTimes(1);
    });

    it('Gemini legitimately returns zero records → NOT treated as provider failure', async () => {
      mockOpenrouter.openrouterExtractStudents.mockRejectedValue(new Error('network'));
      // Gemini "succeeds" with an empty extraction (legitimate no-records case)
      mockGemini.geminiExtractStudents.mockResolvedValue([]);

      const result = await aiExtractStudents('content');

      // Gemini answered successfully (empty but valid) — Groq must NOT be attempted
      expect(result.meta.provider).toBe('gemini');
      expect(result.data).toEqual([]);
      expect(mockGroq.groqExtractStudents).not.toHaveBeenCalled();
    });

    it('results extraction routes correctly', async () => {
      mockOpenrouter.openrouterExtractResults.mockResolvedValue([sampleResult]);

      const result = await aiExtractResults('content', '2024/2025');

      expect(result.meta.provider).toBe('openrouter');
      expect(result.meta.fallbackUsed).toBe(false);
      expect(mockGemini.geminiExtractResults).not.toHaveBeenCalled();
    });
  });

  describe('fallback audit metadata', () => {
    it('primary success → fallbackUsed false in summary', async () => {
      mockOpenrouter.openrouterExtractStudents.mockResolvedValue([sampleStudent]);
      await aiExtractStudents('content');

      const summary = buildAISummary(getAIAuditEntries());
      expect(summary.provider).toBe('openrouter');
      expect(summary.fallbackUsed).toBe(false);
    });

    it('primary failure + Gemini success → fallbackUsed true in summary', async () => {
      mockOpenrouter.openrouterExtractStudents.mockRejectedValue(new Error('down'));
      mockGemini.geminiExtractStudents.mockResolvedValue([sampleStudent]);
      await aiExtractStudents('content');

      const summary = buildAISummary(getAIAuditEntries());
      expect(summary.provider).toBe('gemini');
      expect(summary.fallbackUsed).toBe(true);
    });

    it('primary + Gemini fail + Groq success → fallbackUsed true in summary', async () => {
      mockOpenrouter.openrouterExtractStudents.mockRejectedValue(new Error('1'));
      mockGemini.geminiExtractStudents.mockRejectedValue(new Error('2'));
      mockGroq.groqExtractStudents.mockResolvedValue([sampleStudent]);
      await aiExtractStudents('content');

      const summary = buildAISummary(getAIAuditEntries());
      expect(summary.provider).toBe('groq');
      expect(summary.fallbackUsed).toBe(true);
    });

    it('all providers fail → terminal failure state', async () => {
      mockOpenrouter.openrouterExtractStudents.mockRejectedValue(new Error('1'));
      mockGemini.geminiExtractStudents.mockRejectedValue(new Error('2'));
      mockGroq.groqExtractStudents.mockRejectedValue(new Error('3'));
      await aiExtractStudents('content');

      const summary = buildAISummary(getAIAuditEntries());
      // No provider succeeded — terminal failure (fallbackUsed false is acceptable)
      expect(summary.fallbackUsed).toBe(false);
      expect(summary.errors).toBeGreaterThan(0);
    });
  });

  describe('explanation routing', () => {
    it('Gemma explain succeeds → openrouter, no fallback', async () => {
      mockOpenrouter.openrouterExplainGPA.mockResolvedValue('explanation text');
      const result = await aiExplainGPA(explainData as any);
      expect(result.meta.provider).toBe('openrouter');
      expect(result.meta.fallbackUsed).toBe(false);
    });

    it('Gemma explain fails → Gemini explain fallback', async () => {
      mockOpenrouter.openrouterExplainGPA.mockRejectedValue(new Error('timeout'));
      mockGemini.geminiExplainGPA.mockResolvedValue('gemini explanation');
      const result = await aiExplainGPA(explainData as any);
      expect(result.meta.provider).toBe('gemini');
      expect(result.meta.fallbackUsed).toBe(true);
    });
  });

  describe('vision routing', () => {
    it('vision → OpenRouter primary', async () => {
      mockOpenrouter.openrouterVisionExtract.mockResolvedValue('extracted text');
      const result = await aiVisionExtract('base64data', 'image/png');
      expect(result.meta.provider).toBe('openrouter');
      expect(result.meta.fallbackUsed).toBe(false);
      expect(mockGemini.geminiVisionExtract).not.toHaveBeenCalled();
    });

    it('OpenRouter vision failure → Gemini fallback', async () => {
      mockOpenrouter.openrouterVisionExtract.mockRejectedValue(new Error('429'));
      mockGemini.geminiVisionExtract.mockResolvedValue('gemini vision text');
      const result = await aiVisionExtract('base64data', 'image/png');
      expect(result.meta.provider).toBe('gemini');
      expect(result.meta.fallbackUsed).toBe(true);
    });
  });

  describe('validation routing', () => {
    it('routes validation through OpenRouter first', async () => {
      mockOpenrouter.openrouterValidateWithTools.mockResolvedValue([]);
      const result = await aiValidateWithTools([], 'results', 'CSC');
      expect(result.meta.provider).toBe('openrouter');
      expect(result.meta.fallbackUsed).toBe(false);
    });
  });
});