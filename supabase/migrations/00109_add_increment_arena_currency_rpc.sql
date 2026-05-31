CREATE OR REPLACE FUNCTION public.increment_arena_currency(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET arena_currency = COALESCE(arena_currency, 0) + p_amount
    WHERE id = p_user_id;
END;
$$;
