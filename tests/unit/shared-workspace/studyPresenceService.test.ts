import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studyPresenceService } from '../../../src/features/shared-workspace/services/studyPresenceService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('StudyPresenceService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('upserts user presence', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    await studyPresenceService.updatePresence(
      'ws-1',
      'u-1',
      'focus',
      'Solving Algorithms',
      45
    );

    expect(mockUpsert).toHaveBeenCalled();
  });

  it('fetches room presence and maps with user profiles', async () => {
    const presenceRows = [
      {
        id: 'pres-1',
        workspace_id: 'ws-1',
        user_id: 'u-1',
        status: 'focus',
        activity_title: 'Exam prep',
        focus_minutes_today: 90,
        last_seen_at: '2026-11-08T12:00:00Z',
      },
    ];

    const profileRows = [
      {
        id: 'u-1',
        email: 'alice@nook.space',
        display_name: 'Alice Scholar',
        avatar_url: 'https://example.com/alice.jpg',
        bio: 'Focus mode',
      },
    ];

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'study_room_presence') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: presenceRows, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: profileRows, error: null }),
            }),
          };
        }
        return {};
      }),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const list = await studyPresenceService.getRoomPresence('ws-1');
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('focus');
    expect(list[0].profile?.displayName).toBe('Alice Scholar');
    expect(list[0].profile?.avatarUrl).toBe('https://example.com/alice.jpg');
  });
});
