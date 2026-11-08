import { getSupabaseClient } from '../../../infrastructure/supabase';
import { PresenceStatus, StudyRoomPresence } from '../types';

export class StudyPresenceService {
  /**
   * Upserts the current user's presence state in the virtual study room.
   */
  async updatePresence(
    workspaceId: string,
    userId: string,
    status: PresenceStatus,
    activityTitle?: string,
    focusMinutesToday?: number
  ): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const payload: Record<string, unknown> = {
      workspace_id: workspaceId,
      user_id: userId,
      status,
      activity_title: activityTitle?.trim() || null,
      last_seen_at: new Date().toISOString(),
    };

    if (focusMinutesToday !== undefined) {
      payload.focus_minutes_today = focusMinutesToday;
    }

    await client
      .from('study_room_presence')
      .upsert(payload, { onConflict: 'workspace_id,user_id' });
  }

  /**
   * Fetches current presence of all members in a study room.
   */
  async getRoomPresence(workspaceId: string): Promise<StudyRoomPresence[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data: presenceRows, error } = await client
      .from('study_room_presence')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error || !presenceRows) return [];

    const userIds = presenceRows.map((r) => r.user_id);
    const { data: profiles } = await client
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return presenceRows.map((r) => {
      const p = profileMap.get(r.user_id);
      return {
        id: r.id,
        workspaceId: r.workspace_id,
        userId: r.user_id,
        status: r.status as PresenceStatus,
        activityTitle: r.activity_title,
        focusMinutesToday: r.focus_minutes_today || 0,
        lastSeenAt: r.last_seen_at,
        profile: p
          ? {
              id: p.id,
              email: p.email,
              displayName: p.display_name,
              avatarUrl: p.avatar_url,
              bio: p.bio,
              language: p.language || 'vi',
              theme: p.theme || 'system',
              createdAt: p.created_at,
              updatedAt: p.updated_at,
            }
          : null,
      };
    });
  }

  /**
   * Subscribes to realtime updates of room presence.
   */
  subscribeToRoom(workspaceId: string, onChange: () => void): { unsubscribe: () => void } {
    const client = getSupabaseClient();
    if (!client) return { unsubscribe: () => {} };

    const channel = client
      .channel(`study_room:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_room_presence',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          onChange();
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

export const studyPresenceService = new StudyPresenceService();
