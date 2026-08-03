-- Enforce unique mobile numbers on profiles for security.
-- The uniqueness key is the *normalized* number (matching the client-side
-- normalizePhone(): strip whitespace, drop leading '+', map leading '0' to
-- '254'), so "0712 345 678", "+254712345678" and "254712345678" all collide.
-- NULL/empty phones are excluded (a member may not provide a number).

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (
    regexp_replace(regexp_replace(regexp_replace(phone, '\s+', '', 'g'), '^\+', ''), '^0', '254')
  )
  WHERE phone IS NOT NULL AND phone <> '';
