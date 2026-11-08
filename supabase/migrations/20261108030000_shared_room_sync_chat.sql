-- ==============================================================================
-- NookSpace Migration: 20261108030000_shared_room_sync_chat.sql
-- Description: Shared Room Data (Notes, Tasks, Ambient Audio Sync) & Live Room Chat.
-- ==============================================================================

-- 1. Table for synchronized room canvas data (Notes, Tasks, Audio State)
CREATE TABLE IF NOT EXISTS public.shared_workspace_data (
  workspace_id UUID PRIMARY KEY REFERENCES public.shared_workspaces(id) ON DELETE CASCADE,
  notes JSONB DEFAULT '[]'::jsonb NOT NULL,
  tasks JSONB DEFAULT '[]'::jsonb NOT NULL,
  audio_state JSONB DEFAULT '{"isPlaying": false, "sound": "rain", "soundTitle": "Mưa rào (Gentle Rain)", "volume": 75}'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Table for live room chat messages & system join/leave events
CREATE TABLE IF NOT EXISTS public.shared_workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.shared_workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'chat' CHECK (type IN ('chat', 'system')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_messages_ws_created ON public.shared_workspace_messages(workspace_id, created_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.shared_workspace_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_workspace_messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies for shared_workspace_data
CREATE POLICY "Members can view shared workspace data"
  ON public.shared_workspace_data FOR SELECT TO authenticated
  USING (
    public.check_is_workspace_owner(workspace_id, auth.uid()) OR
    public.check_is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Members can insert or update shared workspace data"
  ON public.shared_workspace_data FOR ALL TO authenticated
  USING (
    public.check_is_workspace_owner(workspace_id, auth.uid()) OR
    public.check_is_workspace_member(workspace_id, auth.uid())
  )
  WITH CHECK (
    public.check_is_workspace_owner(workspace_id, auth.uid()) OR
    public.check_is_workspace_member(workspace_id, auth.uid())
  );

-- 5. Policies for shared_workspace_messages
CREATE POLICY "Members can view shared room messages"
  ON public.shared_workspace_messages FOR SELECT TO authenticated
  USING (
    public.check_is_workspace_owner(workspace_id, auth.uid()) OR
    public.check_is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Members can insert room messages"
  ON public.shared_workspace_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.check_is_workspace_owner(workspace_id, auth.uid()) OR
    public.check_is_workspace_member(workspace_id, auth.uid())
  );

-- 6. Enable Realtime Publications for instant sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'shared_workspace_data'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_workspace_data;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'shared_workspace_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_workspace_messages;
  END IF;
END $$;
