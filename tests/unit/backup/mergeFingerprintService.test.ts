import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  computeEntityFingerprint,
} from '../../../src/features/backup/services/mergeFingerprintService';

describe('Milestone 9.4 — Merge Fingerprint Service Suite', () => {
  describe('normalizeUrl', () => {
    it('normalizes host to lowercase and removes trailing slashes', () => {
      expect(normalizeUrl('HTTPS://EXAMPLE.COM/path/')).toBe('https://example.com/path');
      expect(normalizeUrl('https://example.com///')).toBe('https://example.com');
      expect(normalizeUrl('https://sub.domain.org/foo/bar/?q=1')).toBe('https://sub.domain.org/foo/bar?q=1');
    });

    it('handles empty and malformed URLs gracefully', () => {
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl('   ')).toBe('');
      expect(normalizeUrl('not-a-valid-url')).toBe('not-a-valid-url');
    });
  });

  describe('computeEntityFingerprint', () => {
    it('generates deterministic fingerprint for bookmarks based on url and title', () => {
      const bm1 = {
        id: 'bm-1',
        url: 'https://github.com/nookspace/',
        title: 'NookSpace Repo',
      };
      const bm2 = {
        id: 'bm-2',
        url: 'https://GITHUB.com/nookspace',
        title: '  nookspace repo  ',
      };
      const bmDiff = {
        id: 'bm-3',
        url: 'https://github.com/other',
        title: 'Other',
      };

      expect(computeEntityFingerprint('bookmarks', bm1)).toBe(
        computeEntityFingerprint('bookmarks', bm2)
      );
      expect(computeEntityFingerprint('bookmarks', bm1)).not.toBe(
        computeEntityFingerprint('bookmarks', bmDiff)
      );
    });

    it('generates deterministic fingerprint for notes based on title and content', () => {
      const nt1 = { title: 'Study Notes', content: 'Important details here' };
      const nt2 = { title: '  study notes  ', content: 'Important details here' };
      const ntDiff = { title: 'Study Notes', content: 'Different content' };

      expect(computeEntityFingerprint('notes', nt1)).toBe(
        computeEntityFingerprint('notes', nt2)
      );
      expect(computeEntityFingerprint('notes', nt1)).not.toBe(
        computeEntityFingerprint('notes', ntDiff)
      );
    });

    it('generates deterministic fingerprint for note collections and bookmark groups', () => {
      expect(computeEntityFingerprint('noteCollections', { name: 'Work' })).toBe(
        computeEntityFingerprint('noteCollections', { name: '  work  ' })
      );
      expect(computeEntityFingerprint('bookmarkGroups', { name: 'Dev Tools' })).toBe(
        computeEntityFingerprint('bookmarkGroups', { name: 'dev tools' })
      );
    });

    it('generates deterministic fingerprint for todos', () => {
      const td1 = { title: 'Submit PR', dueDate: 1700000000000 };
      const td2 = { title: '  submit pr  ', dueDate: 1700000000000 };
      expect(computeEntityFingerprint('todos', td1)).toBe(
        computeEntityFingerprint('todos', td2)
      );
    });

    it('generates deterministic fingerprint for workspaces and widget instances', () => {
      expect(computeEntityFingerprint('workspaces', { name: 'Main', icon: 'Home' })).toBe(
        computeEntityFingerprint('workspaces', { name: 'main', icon: 'home' })
      );
      expect(
        computeEntityFingerprint('widgetInstances', { widgetType: 'notes', title: 'Quick Notes' })
      ).toBe(
        computeEntityFingerprint('widgetInstances', { widgetType: 'notes', title: 'quick notes' })
      );
    });

    it('generates deterministic fingerprint for productivity entities', () => {
      const fs1 = { type: 'pomodoro', startedAt: 1000, completedAt: 2500, durationMinutes: 25 };
      const fs2 = { type: 'pomodoro', startedAt: 1000, completedAt: 2500, durationMinutes: 25 };
      expect(computeEntityFingerprint('focusSessions', fs1)).toBe(
        computeEntityFingerprint('focusSessions', fs2)
      );

      const dg1 = { type: 'focus_time', dateString: '2026-11-08' };
      const dg2 = { type: 'focus_time', dateString: '2026-11-08' };
      expect(computeEntityFingerprint('dailyGoals', dg1)).toBe(
        computeEntityFingerprint('dailyGoals', dg2)
      );
    });
  });
});
