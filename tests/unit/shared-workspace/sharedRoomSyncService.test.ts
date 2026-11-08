import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sharedRoomSyncService, DEFAULT_ROOM_DATA } from '../../../src/features/shared-workspace/services/sharedRoomSyncService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('SharedRoomSyncService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches room data and parses notes and tasks', async () => {
    const mockRow = {
      workspace_id: 'ws-123',
      notes: [{ id: 'n1', title: 'Note 1', content: 'Hello', updatedAt: 1000 }],
      tasks: [{ id: 't1', title: 'Task 1', completed: true, updatedAt: 1000 }],
      audio_state: { isPlaying: true, sound: 'rain', soundTitle: 'Rain', volume: 80 },
    };

    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
          })),
        })),
      })),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const data = await sharedRoomSyncService.getRoomData('ws-123');
    expect(data.notes.length).toBe(1);
    expect(data.tasks.length).toBe(1);
    expect(data.audioState.isPlaying).toBe(true);
  });

  it('updates tasks in database', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));

    const mockClient = {
      from: vi.fn(() => ({
        update: mockUpdate,
      })),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    await sharedRoomSyncService.updateTasks('ws-123', [{ id: 't1', title: 'Task', completed: true, updatedAt: 1000 }]);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
