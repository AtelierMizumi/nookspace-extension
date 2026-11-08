import { describe, it, expect } from 'vitest';
import { ambientAudioService, SOUND_PRESETS } from '../../../src/features/shared-workspace/services/ambientAudioService';

describe('AmbientAudioService', () => {
  it('exposes valid sound presets', () => {
    expect(SOUND_PRESETS.length).toBeGreaterThanOrEqual(4);
    const rain = SOUND_PRESETS.find((p) => p.id === 'rain');
    expect(rain).toBeDefined();
    expect(rain?.label).toContain('Mưa');
  });

  it('can stop and report state', () => {
    ambientAudioService.stop();
    expect(ambientAudioService.getIsRunning()).toBe(false);
  });
});
