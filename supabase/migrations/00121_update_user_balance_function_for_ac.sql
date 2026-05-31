CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_balance_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_balance_type = 'available' THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'pending' THEN
    UPDATE profiles
    SET pending_balance = COALESCE(pending_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'arena_currency' THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + p_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;