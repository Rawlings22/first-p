-- Track the Stripe Checkout Session and resulting payment for each order,
-- and default new orders to 'pending' until the Stripe webhook confirms payment.
alter table public.orders
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent text;

alter table public.orders
  alter column status set default 'pending';

-- Note: the Edge Functions use the Supabase *service role* key, which bypasses
-- Row Level Security entirely — no extra policy is needed for them to write orders.
