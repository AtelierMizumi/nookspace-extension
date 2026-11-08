import { getSupabaseClient } from '../../../infrastructure/supabase';
import { CreateSharedWorkspaceInput, SharedWorkspace, SharedWorkspaceMember } from '../types';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class SharedWorkspaceService {
  /**
   * Creates a new shared workspace and automatically registers creator as owner.
   */
  async createWorkspace(input: CreateSharedWorkspaceInput, userId: string): Promise<SharedWorkspace> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('AUTH_UNCONFIGURED');
    }

    const joinCode = generateJoinCode();

    const { data: wsData, error: wsError } = await client
      .from('shared_workspaces')
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        icon: input.icon || 'Users',
        color: input.color || '#6366f1',
        join_code: joinCode,
        owner_id: userId,
      })
      .select()
      .single();

    if (wsError || !wsData) {
      throw wsError || new Error('Failed to create workspace');
    }

    // Add creator as owner in members table
    await client
      .from('shared_workspace_members')
      .insert({
        workspace_id: wsData.id,
        user_id: userId,
        role: 'owner',
      });

    return {
      id: wsData.id,
      name: wsData.name,
      description: wsData.description,
      icon: wsData.icon,
      color: wsData.color,
      joinCode: wsData.join_code,
      ownerId: wsData.owner_id,
      createdAt: wsData.created_at,
      updatedAt: wsData.updated_at,
    };
  }

  /**
   * Retrieves all shared workspaces the user owns or is a member of.
   */
  async getMyWorkspaces(userId: string): Promise<SharedWorkspace[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    // 1. Get workspace IDs from members table
    const { data: memberRows } = await client
      .from('shared_workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    const memberWsIds = (memberRows || []).map((r) => r.workspace_id);

    // 2. Fetch workspaces where user is owner OR member
    const { data: workspaces, error } = await client
      .from('shared_workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !workspaces) return [];

    // Filter to workspaces user has access to
    const filtered = workspaces.filter(
      (ws) => ws.owner_id === userId || memberWsIds.includes(ws.id)
    );

    return filtered.map((ws) => ({
      id: ws.id,
      name: ws.name,
      description: ws.description,
      icon: ws.icon,
      color: ws.color,
      joinCode: ws.join_code,
      ownerId: ws.owner_id,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    }));
  }

  /**
   * Joins a shared workspace by its 6-character code.
   */
  async joinByCode(code: string): Promise<SharedWorkspace> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('AUTH_UNCONFIGURED');
    }

    const cleanCode = code.trim().toUpperCase();

    // Try RPC first
    const { data: rpcRes, error: rpcErr } = await client.rpc('join_shared_workspace', {
      code: cleanCode,
    });

    if (!rpcErr && rpcRes && rpcRes.success && rpcRes.workspace) {
      const ws = rpcRes.workspace;
      return {
        id: ws.id,
        name: ws.name,
        description: ws.description,
        icon: ws.icon,
        color: ws.color,
        joinCode: ws.join_code,
        ownerId: ws.owner_id,
        createdAt: ws.created_at,
        updatedAt: ws.updated_at,
      };
    }

    // Direct fallback lookup
    const { data: ws, error: findError } = await client
      .from('shared_workspaces')
      .select('*')
      .eq('join_code', cleanCode)
      .single();

    if (findError || !ws) {
      throw new Error('sharedWorkspace.errors.invalidCode');
    }

    const { data: { user } } = await client.auth.getUser();
    if (user) {
      await client
        .from('shared_workspace_members')
        .insert({
          workspace_id: ws.id,
          user_id: user.id,
          role: 'member',
        })
        .select();
    }

    return {
      id: ws.id,
      name: ws.name,
      description: ws.description,
      icon: ws.icon,
      color: ws.color,
      joinCode: ws.join_code,
      ownerId: ws.owner_id,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    };
  }

  /**
   * Leaves a shared workspace.
   */
  async leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await client
      .from('shared_workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
  }

  /**
   * Kicks a member out of a shared workspace (owner only).
   */
  async kickMember(workspaceId: string, memberUserId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    await Promise.all([
      client
        .from('shared_workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', memberUserId),
      client
        .from('study_room_presence')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', memberUserId),
    ]);
  }

  /**
   * Deletes a shared workspace completely (owner only).
   */
  async deleteWorkspace(workspaceId: string, ownerId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('shared_workspaces')
      .delete()
      .eq('id', workspaceId)
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }
  }

  /**
   * Retrieves member list and their profiles for a workspace.
   */
  async getMembers(workspaceId: string): Promise<SharedWorkspaceMember[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data: members, error } = await client
      .from('shared_workspace_members')
      .select(`
        id,
        workspace_id,
        user_id,
        role,
        joined_at
      `)
      .eq('workspace_id', workspaceId);

    if (error || !members) return [];

    // Fetch corresponding profiles
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await client
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return members.map((m) => {
      const p = profileMap.get(m.user_id);
      return {
        id: m.id,
        workspaceId: m.workspace_id,
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
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
}

export const sharedWorkspaceService = new SharedWorkspaceService();
