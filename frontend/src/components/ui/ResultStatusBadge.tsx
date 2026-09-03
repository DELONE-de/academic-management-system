// FILE: frontend/src/components/ui/ResultStatusBadge.tsx
// Distinguishes proposed (AI-extracted, not yet official) from official results.
// Text labels are always shown alongside color — never color-only (accessibility).

export type ResultStatus = 'PROPOSED' | 'OFFICIAL';

export function ResultStatusBadge({ status }: { status?: ResultStatus | string }) {
  if (!status || status === 'OFFICIAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" aria-label="Official result">
        <span aria-hidden="true">✓</span> Official
      </span>
    );
  }
  if (status === 'PROPOSED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" aria-label="Proposed, under review">
        <span aria-hidden="true">⚠</span> Proposed · Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700" aria-label={`Status: ${status}`}>
      {status}
    </span>
  );
}