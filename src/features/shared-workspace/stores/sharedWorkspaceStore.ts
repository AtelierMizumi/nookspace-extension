import { create } from 'zustand';
import { useAuthStore } from '../../account/stores/authStore';
import { sharedWorkspaceService } from '../services/sharedWorkspaceService';
import { studyPresenceService } from '../services/studyPresenceService';
import { sharedRoomSyncService, DEFAULT_ROOM_DATA } from '../services/sharedRoomSyncService';
import { roomChatService } from '../services/roomChatService';
import { ambientAudioService, SoundType } from '../services/ambientAudioService';
import {
  CreateSharedWorkspaceInput,
  PresenceStatus,
  RoomChatMessage,
  SharedAudioState,
  SharedNote,
  SharedTask,
  SharedWorkspace,
  SharedWorkspaceState,
} from '../types';

let presenceSubscription: { unsubscribe: () => void } | null = null;
let dataSubscription: { unsubscribe: () => void } | null = null;
let chatSubscription: { unsubscribe: () => void } | null = null;

function cleanupSubscriptions() {
  if (presenceSubscription) {
    presenceSubscription.unsubscribe();
    presenceSubscription = null;
  }
  if (dataSubscription) {
    dataSubscription.unsubscribe();
    dataSubscription = null;
  }
  if (chatSubscription) {
    chatSubscription.unsubscribe();
    chatSubscription = null;
  }
  ambientAudioService.stop();
}

export const useSharedWorkspaceStore = create<SharedWorkspaceState>((set, get) => ({
  workspaces: [],
  activeSharedWorkspace: null,
  members: [],
  presenceList: [],
  roomData: DEFAULT_ROOM_DATA,
  messages: [],
  isChatOpen: false,
  isLoading: false,
  error: null,
  isModalOpen: false,
  isStudyRoomOpen: false,

  loadWorkspaces: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ workspaces: [], activeSharedWorkspace: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const workspaces = await sharedWorkspaceService.getMyWorkspaces(user.id);
      set({ workspaces, isLoading: false });

      // If active workspace is no longer in list, reset to null
      const active = get().activeSharedWorkspace;
      if (active && !workspaces.some((w) => w.id === active.id)) {
        await get().leaveCurrentRoom();
      }
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'sharedWorkspace.errors.loadFailed' });
    }
  },

  createWorkspace: async (input: CreateSharedWorkspaceInput) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;

    set({ isLoading: true, error: null });
    try {
      const created = await sharedWorkspaceService.createWorkspace(input, user.id);
      await get().loadWorkspaces();
      await get().selectSharedWorkspace(created);
      set({ isLoading: false });
      return created;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'sharedWorkspace.errors.createFailed' });
      return null;
    }
  },

  joinWorkspace: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const joined = await sharedWorkspaceService.joinByCode(code);
      await get().loadWorkspaces();
      await get().selectSharedWorkspace(joined);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'sharedWorkspace.errors.joinFailed' });
      return false;
    }
  },

  leaveWorkspace: async (workspaceId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;

    set({ isLoading: true, error: null });
    try {
      if (get().activeSharedWorkspace?.id === workspaceId) {
        await get().leaveCurrentRoom();
      }
      await sharedWorkspaceService.leaveWorkspace(workspaceId, user.id);
      await get().loadWorkspaces();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'sharedWorkspace.errors.leaveFailed' });
      return false;
    }
  },

  deleteWorkspace: async (workspaceId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;

    set({ isLoading: true, error: null });
    try {
      if (get().activeSharedWorkspace?.id === workspaceId) {
        await get().leaveCurrentRoom();
      }
      await sharedWorkspaceService.deleteWorkspace(workspaceId, user.id);
      await get().loadWorkspaces();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'sharedWorkspace.errors.deleteFailed' });
      return false;
    }
  },

  kickMember: async (workspaceId: string, memberUserId: string, memberName: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;

    try {
      await sharedWorkspaceService.kickMember(workspaceId, memberUserId);
      await roomChatService.sendSystemMessage(workspaceId, `${memberName} đã bị mời ra khỏi phòng`).catch(() => {});
      await Promise.all([
        get().loadMembers(workspaceId),
        get().loadPresence(workspaceId),
      ]);
      return true;
    } catch (err: any) {
      console.error('Failed to kick member:', err);
      return false;
    }
  },

  leaveCurrentRoom: async () => {
    const user = useAuthStore.getState().user;
    const ws = get().activeSharedWorkspace;

    if (ws && user) {
      const userName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Thành viên';
      await roomChatService.sendSystemMessage(ws.id, `${userName} đã rời phòng`).catch(() => {});
    }

    cleanupSubscriptions();
    set({
      activeSharedWorkspace: null,
      members: [],
      presenceList: [],
      roomData: DEFAULT_ROOM_DATA,
      messages: [],
      isChatOpen: false,
    });
  },

  selectSharedWorkspace: async (workspace: SharedWorkspace | null) => {
    const user = useAuthStore.getState().user;
    const prevWs = get().activeSharedWorkspace;

    // Notify leave on prior room
    if (prevWs && user && (!workspace || prevWs.id !== workspace.id)) {
      const prevName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Thành viên';
      roomChatService.sendSystemMessage(prevWs.id, `${prevName} đã rời phòng`).catch(() => {});
    }

    cleanupSubscriptions();

    set({
      activeSharedWorkspace: workspace,
      members: [],
      presenceList: [],
      roomData: DEFAULT_ROOM_DATA,
      messages: [],
    });

    if (workspace && user) {
      const userName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Thành viên';

      // Load initial state
      await Promise.all([
        get().loadMembers(workspace.id),
        get().loadPresence(workspace.id),
        get().loadRoomData(workspace.id),
        get().loadMessages(workspace.id),
      ]);

      // Notify join
      await roomChatService.sendSystemMessage(workspace.id, `${userName} đã tham gia phòng`).catch(() => {});

      // 1. Subscribe to live presence
      presenceSubscription = studyPresenceService.subscribeToRoom(workspace.id, () => {
        get().loadPresence(workspace.id);
      });

      // 2. Subscribe to room canvas data changes
      dataSubscription = sharedRoomSyncService.subscribeToRoomData(workspace.id, (incomingData) => {
        const currentAudio = get().roomData.audioState;
        set({ roomData: incomingData });

        // Sync ambient audio playback if state changed
        if (incomingData.audioState.isPlaying && (!currentAudio.isPlaying || currentAudio.sound !== incomingData.audioState.sound)) {
          ambientAudioService.play(incomingData.audioState.sound as SoundType, incomingData.audioState.volume);
        } else if (!incomingData.audioState.isPlaying && currentAudio.isPlaying) {
          ambientAudioService.stop();
        }
      });

      // 3. Subscribe to chat messages
      chatSubscription = roomChatService.subscribeToMessages(workspace.id, (incomingMessage) => {
        set((state) => {
          if (state.messages.some((m) => m.id === incomingMessage.id)) {
            return state;
          }
          return { messages: [...state.messages, incomingMessage] };
        });
      });
    }
  },

  loadMembers: async (workspaceId: string) => {
    try {
      const members = await sharedWorkspaceService.getMembers(workspaceId);
      set({ members });
    } catch {
      // Non-critical
    }
  },

  loadPresence: async (workspaceId: string) => {
    try {
      const presenceList = await studyPresenceService.getRoomPresence(workspaceId);
      set({ presenceList });
    } catch {
      // Non-critical
    }
  },

  updateMyPresence: async (status: PresenceStatus, activityTitle?: string, focusMinutes?: number) => {
    const user = useAuthStore.getState().user;
    const ws = get().activeSharedWorkspace;
    if (!user || !ws) return;

    try {
      await studyPresenceService.updatePresence(ws.id, user.id, status, activityTitle, focusMinutes);
      await get().loadPresence(ws.id);
    } catch {
      // Non-critical
    }
  },

  loadRoomData: async (workspaceId: string) => {
    try {
      const roomData = await sharedRoomSyncService.getRoomData(workspaceId);
      set({ roomData });

      if (roomData.audioState.isPlaying) {
        ambientAudioService.play(roomData.audioState.sound as SoundType, roomData.audioState.volume);
      }
    } catch {
      // Non-critical
    }
  },

  updateNotes: async (notes: SharedNote[]) => {
    const user = useAuthStore.getState().user;
    const ws = get().activeSharedWorkspace;
    if (!ws) return;

    set((state) => ({
      roomData: { ...state.roomData, notes },
    }));

    await sharedRoomSyncService.updateNotes(ws.id, notes, user?.id);
  },

  updateTasks: async (tasks: SharedTask[]) => {
    const user = useAuthStore.getState().user;
    const ws = get().activeSharedWorkspace;
    if (!ws) return;

    set((state) => ({
      roomData: { ...state.roomData, tasks },
    }));

    await sharedRoomSyncService.updateTasks(ws.id, tasks, user?.id);
  },

  updateAudioState: async (audioState: SharedAudioState) => {
    const user = useAuthStore.getState().user;
    const ws = get().activeSharedWorkspace;
    if (!ws) return;

    set((state) => ({
      roomData: { ...state.roomData, audioState },
    }));

    if (audioState.isPlaying) {
      ambientAudioService.play(audioState.sound as SoundType, audioState.volume);
    } else {
      ambientAudioService.stop();
    }

    await sharedRoomSyncService.updateAudioState(ws.id, audioState, user?.id);
  },

  loadMessages: async (workspaceId: string) => {
    try {
      const messages = await roomChatService.getRecentMessages(workspaceId);
      set({ messages });
    } catch {
      // Non-critical
    }
  },

  sendMessage: async (content: string) => {
    const user = useAuthStore.getState().user;
    const ws = get().activeSharedWorkspace;
    if (!user || !ws || !content.trim()) return;

    const senderName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Thành viên';
    const senderAvatar = user.user_metadata?.avatar_url || null;

    await roomChatService.sendMessage(ws.id, user.id, senderName, senderAvatar, content);
  },

  sendSystemMessage: async (content: string) => {
    const ws = get().activeSharedWorkspace;
    if (!ws || !content.trim()) return;

    await roomChatService.sendSystemMessage(ws.id, content);
  },

  openModal: () => {
    set({ isModalOpen: true, error: null });
    get().loadWorkspaces();
  },

  closeModal: () => {
    set({ isModalOpen: false, error: null });
  },

  openStudyRoom: () => {
    set({ isStudyRoomOpen: true });
    const ws = get().activeSharedWorkspace;
    if (ws) {
      get().loadPresence(ws.id);
    }
  },

  closeStudyRoom: () => {
    set({ isStudyRoomOpen: false });
  },

  toggleChat: () => {
    set((state) => ({ isChatOpen: !state.isChatOpen }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
