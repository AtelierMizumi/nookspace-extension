import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSharedWorkspaceStore } from '../../../src/features/shared-workspace/stores/sharedWorkspaceStore';
import { sharedWorkspaceService } from '../../../src/features/shared-workspace/services/sharedWorkspaceService';
import { studyPresenceService } from '../../../src/features/shared-workspace/services/studyPresenceService';
import { sharedRoomSyncService } from '../../../src/features/shared-workspace/services/sharedRoomSyncService';
import { roomChatService } from '../../../src/features/shared-workspace/services/roomChatService';
import { useAuthStore } from '../../../src/features/account/stores/authStore';

describe('SharedWorkspaceStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: { id: 'u-123', email: 'me@nook.space' } as any,
    });
    useSharedWorkspaceStore.setState({
      workspaces: [],
      activeSharedWorkspace: null,
      members: [],
      presenceList: [],
      isLoading: false,
      error: null,
      isModalOpen: false,
      isStudyRoomOpen: false,
    });
  });

  it('loads workspaces for authenticated user', async () => {
    const mockList = [
      {
        id: 'ws-1',
        name: 'Squad A',
        description: null,
        icon: 'Users',
        color: '#6366f1',
        joinCode: 'ABC123',
        ownerId: 'u-123',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T00:00:00Z',
      },
    ];

    vi.spyOn(sharedWorkspaceService, 'getMyWorkspaces').mockResolvedValue(mockList);

    await useSharedWorkspaceStore.getState().loadWorkspaces();

    expect(useSharedWorkspaceStore.getState().workspaces.length).toBe(1);
    expect(useSharedWorkspaceStore.getState().workspaces[0].name).toBe('Squad A');
  });

  it('selects shared workspace and subscribes to room presence', async () => {
    const mockWs = {
      id: 'ws-1',
      name: 'Squad A',
      description: null,
      icon: 'Users',
      color: '#6366f1',
      joinCode: 'ABC123',
      ownerId: 'u-123',
      createdAt: '2026-11-08T00:00:00Z',
      updatedAt: '2026-11-08T00:00:00Z',
    };

    vi.spyOn(sharedWorkspaceService, 'getMembers').mockResolvedValue([]);
    vi.spyOn(studyPresenceService, 'getRoomPresence').mockResolvedValue([]);
    vi.spyOn(studyPresenceService, 'subscribeToRoom').mockReturnValue({ unsubscribe: vi.fn() });
    vi.spyOn(sharedRoomSyncService, 'getRoomData').mockResolvedValue({
      notes: [],
      tasks: [],
      audioState: { isPlaying: false, sound: 'rain', soundTitle: 'Rain', volume: 75 },
    });
    vi.spyOn(sharedRoomSyncService, 'subscribeToRoomData').mockReturnValue({ unsubscribe: vi.fn() });
    vi.spyOn(roomChatService, 'getRecentMessages').mockResolvedValue([]);
    vi.spyOn(roomChatService, 'subscribeToMessages').mockReturnValue({ unsubscribe: vi.fn() });
    vi.spyOn(roomChatService, 'sendSystemMessage').mockResolvedValue();

    await useSharedWorkspaceStore.getState().selectSharedWorkspace(mockWs);

    expect(useSharedWorkspaceStore.getState().activeSharedWorkspace?.id).toBe('ws-1');
  });

  it('modal toggles work as expected', () => {
    useSharedWorkspaceStore.getState().openModal();
    expect(useSharedWorkspaceStore.getState().isModalOpen).toBe(true);

    useSharedWorkspaceStore.getState().closeModal();
    expect(useSharedWorkspaceStore.getState().isModalOpen).toBe(false);

    useSharedWorkspaceStore.getState().openStudyRoom();
    expect(useSharedWorkspaceStore.getState().isStudyRoomOpen).toBe(true);

    useSharedWorkspaceStore.getState().closeStudyRoom();
    expect(useSharedWorkspaceStore.getState().isStudyRoomOpen).toBe(false);
  });
});
