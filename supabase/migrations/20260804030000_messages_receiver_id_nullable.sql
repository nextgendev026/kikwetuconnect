-- Messages are routed through conversation_participants. `receiver_id` is a
-- legacy NOT NULL column from the old direct-message schema that the
-- conversation-based `send_message` RPC never populates, so every message
-- send failed with: null value in column "receiver_id" violates not-null
-- constraint. Drop the NOT NULL so sending works; the column is unused.
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;
