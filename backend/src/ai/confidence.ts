// src/ai/confidence.ts
// Evidence-based confidence scoring for AI-extracted academic records.
// Confidence is calculated from concrete validation signals, not fabricated.
// Pure functions — no DB access — so they are fully unit-testable.

// ============================================================
// CONFIDENCE THRESHOLDS
// ============================================================
// These thresholds are application-level policy. They determine how
// much human attention a record requires:
//   90-100  HIGH    → can move quickly through review
//   70-89   MEDIUM  → review recommended
//   0-69    LOW     → mandatory manual verification
// ============================================================

export const CONFIDENCE_HIGH = 0.9;
export const CONFIDENCE_MEDIUM = 0.7;
export const CONFIDENCE_LOW = 0.0;

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export function bandFor(confidence: number): ConfidenceBand {
  if (confidence >= CONFIDENCE_HIGH) return 'HIGH';
  if (confidence >= CONFIDENCE_MEDIUM) return 'MEDIUM';
  return 'LOW';
}

export interface MatchSignals {
  exactMatric: boolean;        // matric number matched exactly (canonical form)
  normalizedMatric: boolean;   // matched after normalization (case/spacing/punct)
  departmentMatch: boolean;    // department code matches expected
  levelMatch: boolean;         // level matches expected
  nameSimilarity: number;      // 0.0 - 1.0
  ambiguous: boolean;          // multiple potential matches / unresolved
}

/**
 * Student match confidence based on available matching signals.
 */
export function studentMatchConfidence(signals: MatchSignals): number {
  if (signals.ambiguous) return 0.3;

  let score = 0;
  if (signals.exactMatric) score += 0.6;
  else if (signals.normalizedMatric) score += 0.4;

  if (signals.departmentMatch) score += 0.2;
  if (signals.levelMatch) score += 0.1;
  score += signals.nameSimilarity * 0.1;

  return clamp(score);
}

export interface CourseMatchSignals {
  exactCode: boolean;        // course code matched exactly
  normalizedCode: boolean;   // matched after normalization
  departmentCompatible: boolean;
  levelCompatible: boolean;
  semesterCompatible: boolean;
  ambiguous: boolean;
}

/**
 * Course match confidence.
 */
export function courseMatchConfidence(signals: CourseMatchSignals): number {
  if (signals.ambiguous) return 0.3;

  let score = 0;
  if (signals.exactCode) score += 0.5;
  else if (signals.normalizedCode) score += 0.35;

  if (signals.departmentCompatible) score += 0.2;
  if (signals.levelCompatible) score += 0.15;
  if (signals.semesterCompatible) score += 0.15;

  return clamp(score);
}

/**
 * Score extraction confidence based on validation signals.
 * A score that passes numeric-range validation and normalization cleanly
 * is high confidence; one that needed loose parsing is lower.
 */
export function scoreExtractionConfidence(opts: {
  validRange: boolean;
  cleanNumeric: boolean;    // directly numeric (no % or fraction)
  consistentType: boolean;  // matches expected type of source cell
}): number {
  if (!opts.validRange) return 0.1;
  let score = 0.7;
  if (opts.cleanNumeric) score += 0.2;
  if (opts.consistentType) score += 0.1;
  return clamp(score);
}

/**
 * Field confidence for a single extracted field (e.g., semester, session, level).
 * Derived from whether the value normalized cleanly into a canonical enum.
 */
export function fieldConfidence(opts: {
  present: boolean;
  canonical: boolean;  // normalized to known enum/format
  unambiguous: boolean;
}): number {
  if (!opts.present) return 0.0;
  let score = 0.5;
  if (opts.canonical) score += 0.3;
  if (opts.unambiguous) score += 0.2;
  return clamp(score);
}

/**
 * Overall record confidence — weighted combination of component confidences.
 */
export function overallRecordConfidence(components: number[]): number {
  if (components.length === 0) return 0;
  // Conservative: use the minimum, biased by the average, so a single weak
  // component cannot be hidden by strong ones.
  const min = Math.min(...components);
  const avg = components.reduce((a, b) => a + b, 0) / components.length;
  return clamp((min * 0.7) + (avg * 0.3));
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

/**
 * Normalized string similarity (0-1) using bigram overlap — good for
 * name comparison without external dependencies.
 */
export function nameSimilarity(a: string, b: string): number {
  const normA = (a || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const normB = (b || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.8;

  const bigrams = (s: string) => {
    const grams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) grams.add(s.slice(i, i + 2));
    return grams;
  };
  const ga = bigrams(normA);
  const gb = bigrams(normB);
  if (ga.size === 0 || gb.size === 0) return 0;
  let common = 0;
  for (const g of ga) if (gb.has(g)) common++;
  return (2 * common) / (ga.size + gb.size);
}
