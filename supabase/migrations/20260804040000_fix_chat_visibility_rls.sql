-- Fix conversation visibility + security for the chat feature.
--
-- 1. conversation_participants was read-only for the caller's OWN row only
--    (cp_read_own), so the nested conversations.participants query never
--    returned the OTHER participant's profile -> blank names/avatars in the
--    chat list, and existing-DM reuse in the client failed. Participants now
--    see every participant row of conversations they belong to.
-- 2. conversations / messages had `UPDATE ... USING true` policies (any
--    authenticated user could edit ANY conversation or message). Scope both
--    to participants.
-- 3. No DELETE policy existed on conversation_participants, so the "delete
--    conversation" action in the chat UI was silently blocked by RLS.
--    Participants may now delete their own participant row.

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = (SELECT auth.uid())
  );
$$;

-- Participants can read all participant rows of conversations they belong to.
DROP POLICY IF EXISTS cp_read_own ON public.conversation_participants;
DROP POLICY IF EXISTS cp_read_participant ON public.conversation_participants;
CREATE POLICY cp_read_participant ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

-- Participants can delete their own membership (unsubscribe / delete chat).
DROP POLICY IF EXISTS cp_delete_own ON public.conversation_participants;
CREATE POLICY cp_delete_own ON public.conversation_participants
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Conversations may only be updated by participants (e.g. last_message).
DROP POLICY IF EXISTS conversations_update_all ON public.conversations;
CREATE POLICY conversations_update_participant ON public.conversations
  FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(id))
  WITH CHECK (public.is_conversation_participant(id));

-- Messages may only be updated by participants (e.g. mark read via RPC is
-- SECURITY DEFINER so it is unaffected; this just closes the open hole).
DROP POLICY IF EXISTS messages_update_all ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY messages_update_participant ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(conversation_id))
  WITH CHECK (public.is_conversation_participant(conversation_id));

notify pgrst, 'reload schema';
