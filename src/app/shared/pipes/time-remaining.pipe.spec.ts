import { describe, it, expect } from 'vitest';
import { TimeRemainingPipe } from './time-remaining.pipe';

describe('TimeRemainingPipe', () => {
  const pipe = new TimeRemainingPipe();

  it('transforms null or undefined to fallback string', () => {
    expect(pipe.transform(null)).toBe('--:--');
    expect(pipe.transform(undefined)).toBe('--:--');
  });

  it('returns Time\'s up when timer is expired', () => {
    const pastTime = new Date(Date.now() - 5000).toISOString();
    expect(pipe.transform(pastTime)).toContain("Time's up");
  });

  it('formats remaining time into MM:SS correctly', () => {
    const futureTime = new Date(Date.now() + 125 * 1000).toISOString();
    const result = pipe.transform(futureTime);
    expect(result).toMatch(/^02:0[45]/);
  });
});
