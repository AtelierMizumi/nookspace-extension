import { UserProfile } from '../account/types';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type PresenceStatus = 'idle' | 'focus' | 'break';

export interface SharedWorkspace {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  joinCode: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  profile?: UserProfile | null;
}

export interface StudyRoomPresence {
  id: string;
  workspaceId: string;
  userId: string;
  status: PresenceStatus;
  activityTitle: string | null;
  focusMinutesToday: number;
  lastSeenAt: string;
  profile?: UserProfile | null;
}

export interface CreateSharedWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface SharedNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  updatedByName?: string;
}

export interface SharedTask {
  id: string;
  title: string;
  completed: boolean;
  updatedAt: number;
  completedByName?: string;
}

export interface SharedAudioState {
  isPlaying: boolean;
  sound: string;
  soundTitle: string;
  volume: number;
  updatedByName?: string;
}

export interface SharedWorkspaceData {
  notes: SharedNote[];
  tasks: SharedTask[];
  audioState: SharedAudioState;
}

export interface RoomChatMessage {
  id: string;
  workspaceId: string;
  userId: string | null;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  type: 'chat' | 'system';
  createdAt: string;
}

export interface SharedWorkspaceState {
  workspaces: SharedWorkspace[];
  activeSharedWorkspace: SharedWorkspace | null;
  members: SharedWorkspaceMember[];
  presenceList: StudyRoomPresence[];
  roomData: SharedWorkspaceData;
  messages: RoomChatMessage[];
  isChatOpen: boolean;
  isLoading: boolean;
  error: string | null;
  isModalOpen: boolean;
  isStudyRoomOpen: boolean;

  // Actions
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (input: CreateSharedWorkspaceInput) => Promise<SharedWorkspace | null>;
  joinWorkspace: (code: string) => Promise<boolean>;
  leaveWorkspace: (workspaceId: string) => Promise<boolean>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;
  kickMember: (workspaceId: string, memberUserId: string, memberName: string) => Promise<boolean>;
  leaveCurrentRoom: () => Promise<void>;
  selectSharedWorkspace: (workspace: SharedWorkspace | null) => Promise<void>;
  loadMembers: (workspaceId: string) => Promise<void>;
  loadPresence: (workspaceId: string) => Promise<void>;
  updateMyPresence: (status: PresenceStatus, activityTitle?: string, focusMinutes?: number) => Promise<void>;
  loadRoomData: (workspaceId: string) => Promise<void>;
  updateNotes: (notes: SharedNote[]) => Promise<void>;
  updateTasks: (tasks: SharedTask[]) => Promise<void>;
  updateAudioState: (audioState: SharedAudioState) => Promise<void>;
  loadMessages: (workspaceId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  sendSystemMessage: (content: string) => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  openStudyRoom: () => void;
  closeStudyRoom: () => void;
  toggleChat: () => void;
  clearError: () => void;
}
