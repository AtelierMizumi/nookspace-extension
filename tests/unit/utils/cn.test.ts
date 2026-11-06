import { describe, it, expect } from 'vitest';
import { cn } from '@/utils/cn';

describe('cn utility', () => {
  it('combines string class names', () => {
    expect(cn('px-4', 'py-2', 'bg-blue-500')).toBe('px-4 py-2 bg-blue-500');
  });

  it('filters out falsy and undefined values', () => {
    expect(cn('btn', false && 'hidden', null, undefined, 'btn-primary')).toBe('btn btn-primary');
  });

  it('handles object condition maps', () => {
    expect(cn('btn', { 'btn-active': true, 'btn-disabled': false })).toBe('btn btn-active');
  });

  it('handles nested arrays', () => {
    expect(cn('base', ['nested-1', ['nested-2', false && 'nested-3']])).toBe('base nested-1 nested-2');
  });
});
