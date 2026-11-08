import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sharedWorkspaceService } from '../../../src/features/shared-workspace/services/sharedWorkspaceService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('SharedWorkspaceService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates workspace and automatically adds creator as owner', async () => {
    const mockWsRow = {
      id: 'ws-shared-1',
      name: 'Focus Lab',
      description: 'Dev testing group',
      icon: 'Users',
      color: '#6366f1',
      join_code: 'FLAB99',
      owner_id: 'user-100',
      created_at: '2026-11-08T00:00:00Z',
      updated_at: '2026-11-08T00:00:00Z',
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockWsRow, error: null }),
      }),
    });

    const mockMemberInsert = vi.fn().mockResolvedValue({ error: null });

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'shared_workspaces') {
          return { insert: mockInsert };
        }
        if (table === 'shared_workspace_members') {
          return { insert: mockMemberInsert };
        }
        return {};
      }),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const ws = await sharedWorkspaceService.createWorkspace(
      { name: 'Focus Lab', description: 'Dev testing group' },
      'user-100'
    );

    expect(ws.id).toBe('ws-shared-1');
    expect(ws.name).toBe('Focus Lab');
    expect(ws.joinCode.length).toBeGreaterThan(0);
    expect(mockMemberInsert).toHaveBeenCalledWith({
      workspace_id: 'ws-shared-1',
      user_id: 'user-100',
      role: 'owner',
    });
  });

  it('joins workspace by code successfully', async () => {
    const mockWsRow = {
      id: 'ws-shared-2',
      name: 'Study Hall',
      join_code: 'JOIN99',
      owner_id: 'user-200',
    };

    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: { success: true, workspace: mockWsRow },
        error: null,
      }),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const joined = await sharedWorkspaceService.joinByCode('join99');
    expect(joined.id).toBe('ws-shared-2');
    expect(mockClient.rpc).toHaveBeenCalledWith('join_shared_workspace', { code: 'JOIN99' });
  });
});
