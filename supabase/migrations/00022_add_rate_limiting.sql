-- Create rate_limits table to track API request rates
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL, -- API endpoint being rate limited
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON rate_limits(identifier, endpoint, window_start);

-- Function to clean up old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start timestamptz;
  v_request_count integer;
  v_allowed boolean;
  v_reset_at timestamptz;
BEGIN
  -- Calculate window start (round down to window_minutes)
  v_window_start := date_trunc('minute', now()) - 
    (EXTRACT(minute FROM now())::integer % p_window_minutes) * interval '1 minute';
  
  -- Try to get existing record
  SELECT request_count INTO v_request_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
  
  IF v_request_count IS NULL THEN
    -- First request in this window
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, v_window_start);
    v_request_count := 1;
  ELSE
    -- Increment request count
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start = v_window_start;
    v_request_count := v_request_count + 1;
  END IF;
  
  -- Check if limit exceeded
  v_allowed := v_request_count <= p_max_requests;
  v_reset_at := v_window_start + (p_window_minutes * interval '1 minute');
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'request_count', v_request_count,
    'limit', p_max_requests,
    'reset_at', v_reset_at,
    'retry_after', EXTRACT(EPOCH FROM (v_reset_at - now()))::integer
  );
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO anon;