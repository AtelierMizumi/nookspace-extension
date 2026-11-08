-- ==============================================================================
-- NookSpace Migration: 20261108020000_shared_workspaces.sql
-- Description: Shared Workspaces, Membership, and Virtual Study Room Presence.
-- ==============================================================================

-- 1. Shared Workspaces table
CREATE TABLE IF NOT EXISTS public.shared_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Users',
  color TEXT DEFAULT '#6366f1',
  join_code TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on join_code and owner_id
CREATE INDEX IF NOT EXISTS idx_shared_workspaces_join_code ON public.shared_workspaces(join_code);
CREATE INDEX IF NOT EXISTS idx_shared_workspaces_owner ON public.shared_workspaces(owner_id);

-- 2. Workspace Members table
CREATE TABLE IF NOT EXISTS public.shared_workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.shared_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.shared_workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.shared_workspace_members(workspace_id);

-- 3. Virtual Study Room Presence table
CREATE TABLE IF NOT EXISTS public.study_room_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.shared_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'focus', 'break')),
  activity_title TEXT,
  focus_minutes_today INT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_room_presence UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_room_presence_ws ON public.study_room_presence(workspace_id);

-- 4. Enable RLS
ALTER TABLE public.shared_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_presence ENABLE ROW LEVEL SECURITY;

-- Security Definer helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.check_is_workspace_member(ws_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_workspace_owner(ws_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_workspaces
    WHERE id = ws_id AND owner_id = u_id
  );
$$;

-- 5. Shared Workspaces Policies
-- Members or owners can view workspaces
CREATE POLICY "Members can view their shared workspaces"
  ON public.shared_workspaces
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    public.check_is_workspace_member(id, auth.uid())
  );

-- Authenticated users can create workspaces
CREATE POLICY "Authenticated users can create shared workspaces"
  ON public.shared_workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their workspaces
CREATE POLICY "Owners can update shared workspaces"
  ON public.shared_workspaces
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their workspaces
CREATE POLICY "Owners can delete shared workspaces"
  ON public.shared_workspaces
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 6. Workspace Members Policies
-- Members can view fellow members in the same workspace
CREATE POLICY "Members can view fellow workspace members"
  ON public.shared_workspace_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.check_is_workspace_owner(workspace_id, auth.uid()) OR
    public.check_is_workspace_member(workspace_id, auth.uid())
  );

-- Users or owners can insert membership
CREATE POLICY "Users or owners can insert membership"
  ON public.shared_workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    public.check_is_workspace_owner(workspace_id, auth.uid())
  );

-- Members or owners can delete membership (leave or kick)
CREATE POLICY "Members can leave or owner can remove members"
  ON public.shared_workspace_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.check_is_workspace_owner(workspace_id, auth.uid())
  );

-- 7. Study Room Presence Policies
-- Members of a workspace can view presence
CREATE POLICY "Members can view room presence"
  ON public.study_room_presence
  FOR SELECT
  TO authenticated
  USING (
    public.check_is_workspace_owner(workspace_id, auth.uid()) OR
    public.check_is_workspace_member(workspace_id, auth.uid())
  );

-- Users can upsert their own presence
CREATE POLICY "Users can insert own presence"
  ON public.study_room_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence"
  ON public.study_room_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. Stored Procedure: Safe Join by Code
CREATE OR REPLACE FUNCTION public.join_shared_workspace(code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_ws public.shared_workspaces%ROWTYPE;
BEGIN
  SELECT * INTO target_ws
  FROM public.shared_workspaces
  WHERE upper(trim(join_code)) = upper(trim(code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'workspace_not_found');
  END IF;

  INSERT INTO public.shared_workspace_members (workspace_id, user_id, role)
  VALUES (target_ws.id, auth.uid(), 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true, 'workspace', row_to_json(target_ws));
END;
$$;
