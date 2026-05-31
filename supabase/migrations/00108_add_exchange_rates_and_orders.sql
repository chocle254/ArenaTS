-- Order status enum (check if exists first)
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    items jsonb NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'usd',
    status order_status NOT NULL DEFAULT 'pending'::order_status,
    stripe_session_id text UNIQUE,
    stripe_payment_intent_id text,
    customer_email text,
    customer_name text,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
DO $$ BEGIN
    CREATE POLICY "Users can view own orders"
        ON public.orders FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Service role can manage orders
DO $$ BEGIN
    CREATE POLICY "Service role can manage orders"
        ON public.orders FOR ALL
        USING (true); -- We will rely on security definer functions or service role key
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Exchange Rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency text NOT NULL,
    target_currency text NOT NULL,
    rate numeric(20,8) NOT NULL,
    last_updated timestamptz DEFAULT now(),
    UNIQUE(base_currency, target_currency)
);

-- Users can view exchange rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Anyone can view exchange rates"
        ON public.exchange_rates FOR SELECT
        USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add demo data for exchange rates
INSERT INTO public.exchange_rates (base_currency, target_currency, rate)
VALUES 
('USD', 'KES', 129.5),
('USD', 'NGN', 1550),
('USD', 'GHS', 15.2),
('USD', 'UGX', 3680),
('USD', 'TZS', 2580)
ON CONFLICT (base_currency, target_currency) DO UPDATE SET rate = EXCLUDED.rate;
