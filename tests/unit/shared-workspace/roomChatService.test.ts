import { describe, it, expect, vi, beforeEach } from 'vitest';
import { roomChatService } from '../../../src/features/shared-workspace/services/roomChatService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('RoomChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches recent messages ordered by createdAt', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        workspace_id: 'ws-123',
        user_id: 'u-1',
        sender_name: 'Bao',
        sender_avatar: null,
        content: 'Xin chào',
        type: 'chat',
        created_at: '2026-11-08T00:00:00Z',
      },
    ];

    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
            })),
          })),
        })),
      })),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const msgs = await roomChatService.getRecentMessages('ws-123');
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toBe('Xin chào');
  });

  it('sends system message with type system', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    const mockClient = {
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    await roomChatService.sendSystemMessage('ws-123', 'Bao đã tham gia phòng');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Bao đã tham gia phòng',
        type: 'system',
      })
    );
  });
});
