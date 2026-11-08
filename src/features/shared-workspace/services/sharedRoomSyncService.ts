import { getSupabaseClient } from '../../../infrastructure/supabase';
import { SharedAudioState, SharedNote, SharedTask, SharedWorkspaceData } from '../types';

export const DEFAULT_ROOM_DATA: SharedWorkspaceData = {
  notes: [
    {
      id: 'welcome-note',
      title: '📌 Ghi chú chung phòng học',
      content: 'Chào mừng các bạn đến với phòng học chung! Mọi người có thể cùng viết ghi chú, chia sẻ tài liệu và ý tưởng tại đây. Dữ liệu được đồng bộ trực tiếp tới tất cả thành viên trong phòng.',
      updatedAt: Date.now(),
      updatedByName: 'Hệ thống',
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Bắt đầu phiên học tập trung',
      completed: false,
      updatedAt: Date.now(),
      completedByName: undefined,
    },
    {
      id: 'task-2',
      title: 'Tổng kết nội dung bài học',
      completed: false,
      updatedAt: Date.now(),
      completedByName: undefined,
    },
  ],
  audioState: {
    isPlaying: false,
    sound: 'rain',
    soundTitle: 'Mưa rào (Gentle Rain)',
    volume: 75,
  },
};

export class SharedRoomSyncService {
  async getRoomData(workspaceId: string): Promise<SharedWorkspaceData> {
    const client = getSupabaseClient();
    if (!client) return DEFAULT_ROOM_DATA;

    try {
      const { data, error } = await client
        .from('shared_workspace_data')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error || !data) {
        // Initialize default row if not present
        await this.initRoomData(workspaceId, DEFAULT_ROOM_DATA);
        return DEFAULT_ROOM_DATA;
      }

      return {
        notes: Array.isArray(data.notes) ? data.notes : DEFAULT_ROOM_DATA.notes,
        tasks: Array.isArray(data.tasks) ? data.tasks : DEFAULT_ROOM_DATA.tasks,
        audioState: data.audio_state || DEFAULT_ROOM_DATA.audioState,
      };
    } catch {
      return DEFAULT_ROOM_DATA;
    }
  }

  async initRoomData(workspaceId: string, initialData: SharedWorkspaceData = DEFAULT_ROOM_DATA): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await client
      .from('shared_workspace_data')
      .upsert({
        workspace_id: workspaceId,
        notes: initialData.notes,
        tasks: initialData.tasks,
        audio_state: initialData.audioState,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });
  }

  async updateNotes(workspaceId: string, notes: SharedNote[], userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await client
      .from('shared_workspace_data')
      .update({
        notes,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('workspace_id', workspaceId);
  }

  async updateTasks(workspaceId: string, tasks: SharedTask[], userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await client
      .from('shared_workspace_data')
      .update({
        tasks,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('workspace_id', workspaceId);
  }

  async updateAudioState(workspaceId: string, audioState: SharedAudioState, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await client
      .from('shared_workspace_data')
      .update({
        audio_state: audioState,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('workspace_id', workspaceId);
  }

  subscribeToRoomData(
    workspaceId: string,
    onDataChange: (data: SharedWorkspaceData) => void
  ): { unsubscribe: () => void } {
    const client = getSupabaseClient();
    if (!client) return { unsubscribe: () => {} };

    const channel = client
      .channel(`room_data:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_workspace_data',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: any) => {
          if (payload.new) {
            onDataChange({
              notes: Array.isArray(payload.new.notes) ? payload.new.notes : [],
              tasks: Array.isArray(payload.new.tasks) ? payload.new.tasks : [],
              audioState: payload.new.audio_state || DEFAULT_ROOM_DATA.audioState,
            });
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        client.removeChannel(channel);
      },
    };
  }
}

export const sharedRoomSyncService = new SharedRoomSyncService();
