import { describe, it, expect, beforeEach } from 'vitest';
import { BackgroundRepository } from '../../../src/services/database/repositories/backgroundRepository';
import { NookSpaceDB } from '../../../src/services/database/db';

describe('BackgroundRepository', () => {
  let testDb: NookSpaceDB;
  let repo: BackgroundRepository;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test_bg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    repo = new BackgroundRepository(testDb);

    await testDb.settings.put({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      backgroundMode: 'cover',
      backgroundOverlay: 50,
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default-personal',
      updatedAt: Date.now(),
    });
  });

  it('1. rejects files exceeding 10MB limit', async () => {
    const hugeBlob = new Blob(['x'.repeat(100)], { type: 'image/jpeg' });
    const hugeFile = new File([hugeBlob], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(hugeFile, 'size', { value: 11 * 1024 * 1024 });

    const result = await repo.validateImageFile(hugeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10MB limit');
  });

  it('2. rejects unsupported file extensions/mime types', async () => {
    const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const result = await repo.validateImageFile(textFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported image format');
  });

  it('3. validates HTTPS image URLs and rejects unsafe protocols', () => {
    expect(repo.validateImageUrl('https://images.unsplash.com/photo-123.jpg').valid).toBe(true);
    expect(repo.validateImageUrl('http://localhost:3000/wallpaper.png').valid).toBe(true);

    // Unsafe protocols
    expect(repo.validateImageUrl('javascript:alert(1)').valid).toBe(false);
    expect(repo.validateImageUrl('data:image/png;base64,123').valid).toBe(false);
    expect(repo.validateImageUrl('file:///etc/passwd').valid).toBe(false);
    expect(repo.validateImageUrl('not-a-url').valid).toBe(false);
    expect(repo.validateImageUrl('').valid).toBe(false);
  });

  it('4. updates display mode and overlay intensity safely', async () => {
    const updated = await repo.updateBackgroundSettings({
      mode: 'contain',
      overlay: 25,
    });

    expect(updated.backgroundMode).toBe('contain');
    expect(updated.backgroundOverlay).toBe(25);

    const fromDb = await testDb.settings.get('current_settings');
    expect(fromDb?.backgroundMode).toBe('contain');
    expect(fromDb?.backgroundOverlay).toBe(25);
  });

  it('5. clears local background and reverts to default theme color', async () => {
    // Put dummy local background
    await (testDb.settings as any).put({
      id: 'custom_background_image',
      dataUrl: 'data:image/png;base64,fake',
      mimeType: 'image/png',
      size: 100,
      updatedAt: Date.now(),
    });

    await repo.clearLocalBackgroundImage();

    const storedBg = await repo.getLocalBackgroundImage();
    expect(storedBg).toBeNull();

    const settings = await testDb.settings.get('current_settings');
    expect(settings?.backgroundType).toBe('color');
    expect(settings?.backgroundValue).toBe('#09090b');
  });
});
