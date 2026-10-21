-- Player deposits now top up UpesiPay's Disbursement Wallet (the wallet B2C
-- payouts are paid from). That route charges a flat 5%, up from 4.5% on the
-- old payments-wallet collection.
ALTER TABLE public.platform_settings ALTER COLUMN deposit_fee_bps SET DEFAULT 500;
UPDATE public.platform_settings SET deposit_fee_bps = 500 WHERE deposit_fee_bps IS DISTINCT FROM 500;
