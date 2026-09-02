// src/__tests__/concurrency.test.ts
// Tests for the bounded AI concurrency semaphore used to prevent bulk uploads
// from firing unbounded simultaneous AI requests.

import { Semaphore } from '../utils/concurrency.js';

describe('Semaphore', () => {
  it('allows at most `max` concurrent operations', async () => {
    const max = 3;
    const sem = new Semaphore(max);
    let active = 0;
    let peak = 0;

    const task = async (i: number) => {
      await sem.acquire();
      try {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 10));
      } finally {
        active--;
        sem.release();
      }
      return i;
    };

    await Promise.all(Array.from({ length: 100 }, (_, i) => task(i)));

    expect(peak).toBeLessThanOrEqual(max);
    expect(peak).toBe(max); // concurrency actually engaged
  });

  it('serializes when max = 1', async () => {
    const sem = new Semaphore(1);
    let active = 0;
    let peak = 0;
    let order = '';

    const task = async (i: number) => {
      await sem.acquire();
      try {
        active++;
        peak = Math.max(peak, active);
        order += String(i);
        await new Promise((r) => setTimeout(r, 5));
      } finally {
        active--;
        sem.release();
      }
    };

    await Promise.all(Array.from({ length: 5 }, (_, i) => task(i)));
    expect(peak).toBe(1);
    expect(order).toBe('01234'); // strictly serialized
  });

  it('run() acquires, executes, and releases even when fn throws', async () => {
    const sem = new Semaphore(2);
    await expect(
      sem.run(async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');

    // After a throw, the semaphore must still have capacity
    const result = await sem.run(async () => 'ok');
    expect(result).toBe('ok');
  });

  it('rejects max < 1', () => {
    expect(() => new Semaphore(0)).toThrow();
  });
});