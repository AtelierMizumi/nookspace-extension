import { getSupabaseClient } from '../../../infrastructure/supabase';
import { RoomChatMessage } from '../types';

export class RoomChatService {
  async getRecentMessages(workspaceId: string, limit: number = 60): Promise<RoomChatMessage[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('shared_workspace_messages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        senderName: row.sender_name,
        senderAvatar: row.sender_avatar,
        content: row.content,
        type: row.type as 'chat' | 'system',
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  }

  async sendMessage(
    workspaceId: string,
    userId: string,
    senderName: string,
    senderAvatar: string | undefined,
    content: string
  ): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await client.from('shared_workspace_messages').insert({
      workspace_id: workspaceId,
      user_id: userId,
      sender_name: senderName,
      sender_avatar: senderAvatar || null,
      content: content.trim(),
      type: 'chat',
    });
  }

  async sendSystemMessage(workspaceId: string, content: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await client.from('shared_workspace_messages').insert({
      workspace_id: workspaceId,
      user_id: null,
      sender_name: 'Hệ thống',
      content: content.trim(),
      type: 'system',
    });
  }

  subscribeToMessages(
    workspaceId: string,
    onMessage: (message: RoomChatMessage) => void
  ): { unsubscribe: () => void } {
    const client = getSupabaseClient();
    if (!client) return { unsubscribe: () => {} };

    const channel = client
      .channel(`room_messages:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shared_workspace_messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: any) => {
          if (payload.new) {
            onMessage({
              id: payload.new.id,
              workspaceId: payload.new.workspace_id,
              userId: payload.new.user_id,
              senderName: payload.new.sender_name,
              senderAvatar: payload.new.sender_avatar,
              content: payload.new.content,
              type: payload.new.type,
              createdAt: payload.new.created_at,
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

export const roomChatService = new RoomChatService();
