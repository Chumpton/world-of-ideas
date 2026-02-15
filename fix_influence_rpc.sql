-- ==============================================================================
-- MIGRATION: ADD INFLUENCE RPC
-- ==============================================================================
-- This script creates a secure Remote Procedure Call (RPC) to atomicallly increment influence.
-- This prevents race conditions where two updates happen at once and one is lost.

CREATE OR REPLACE FUNCTION public.increment_influence(user_id UUID, delta INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET influence = COALESCE(influence, 0) + delta
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_influence(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_influence(UUID, INTEGER) TO service_role;
