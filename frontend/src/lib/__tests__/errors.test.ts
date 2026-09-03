// src/lib/__tests__/errors.test.ts
// Business-critical: error mapping never exposes raw exceptions / stack traces.

import { AxiosError, AxiosHeaders } from 'axios';
import { toFriendlyError, friendlyMessage } from '../errors';

function makeAxiosError(status: number | undefined, message?: string): AxiosError<any> {
  const error = new AxiosError(
    message || 'Request failed',
    status ? String(status) : 'ERR_NETWORK',
    new AxiosHeaders(),
    {},
    status
      ? { status, data: { message }, headers: {}, config: { headers: new AxiosHeaders() } as any }
      : undefined
  );
  return error;
}

describe('toFriendlyError', () => {
  it('maps 401 to a session-expired message (no raw output)', () => {
    const e = toFriendlyError(makeAxiosError(401));
    expect(e.kind).toBe('auth');
    expect(e.message).toContain('session has expired');
  });

  it('maps 403 to access-denied message', () => {
    const e = toFriendlyError(makeAxiosError(403));
    expect(e.kind).toBe('forbidden');
    expect(e.message).toContain("don't have permission");
  });

  it('maps 404 to not-found', () => {
    expect(toFriendlyError(makeAxiosError(404)).kind).toBe('not-found');
  });

  it('maps 429 to rate-limit message', () => {
    const e = toFriendlyError(makeAxiosError(429));
    expect(e.kind).toBe('rate-limit');
    expect(e.message).toContain('Too many requests');
  });

  it('maps 500 to server message without leaking details', () => {
    const e = toFriendlyError(makeAxiosError(500, 'secret internal detail'));
    expect(e.kind).toBe('server');
    expect(e.message).toContain('Something went wrong');
    expect(e.message).not.toContain('secret internal detail');
  });

  it('maps 400/422 to validation message but keeps backend guidance', () => {
    const e = toFriendlyError(makeAxiosError(422, 'Score must be 0-100'));
    expect(e.kind).toBe('validation');
    expect(e.message).toContain('Score must be 0-100');
  });

  it('maps network failure (no response) to network message', () => {
    const e = toFriendlyError(makeAxiosError(undefined));
    expect(e.kind).toBe('network');
    expect(e.message).toContain('Network error');
  });

  it('maps non-axios errors to unknown with fallback', () => {
    const e = toFriendlyError(new Error('boom'), 'Custom fallback');
    expect(e.kind).toBe('unknown');
    expect(e.message).toBe('Custom fallback');
  });
});

describe('friendlyMessage', () => {
  it('returns a safe message', () => {
    expect(friendlyMessage(makeAxiosError(500, 'stack')).length).toBeGreaterThan(0);
  });
});