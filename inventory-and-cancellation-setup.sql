-- 1. Real inventory count. The existing `stock` text column ('in-stock' /
-- 'low-stock' / 'backordered') becomes a derived label, auto-kept in sync
-- with this number by the trigger below — admins only ever edit the number.
alter table public.products
  add column if not exists stock_quantity integer not null default 0;

update public.products set stock_quantity = case
  when stock = 'in-stock' then 50
  when stock = 'low-stock' then 5
  when stock = 'backordered' then 0
  else 50
end
where stock_quantity = 0;

create or replace function public.sync_stock_status()
returns trigger
language plpgsql
as $$
begin
  if new.stock_quantity <= 0 then
    new.stock := 'backordered';
  elsif new.stock_quantity < 10 then
    new.stock := 'low-stock';
  else
    new.stock := 'in-stock';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_stock_status on public.products;
create trigger trg_sync_stock_status
  before insert or update of stock_quantity on public.products
  for each row execute function public.sync_stock_status();

-- 1b. Server-only helper the webhook uses to adjust stock after a real
-- payment. Locked to the service role — never callable from the browser,
-- so a client can't call this directly to fake stock changes.
create or replace function public.adjust_product_stock(p_product_id text, p_delta integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.products
  set stock_quantity = greatest(0, stock_quantity + p_delta)
  where id = p_product_id;
end;
$$;

revoke all on function public.adjust_product_stock(text, integer) from public, anon, authenticated;
grant execute on function public.adjust_product_stock(text, integer) to service_role;

-- 2. Let admins cancel orders (used for stale pending orders). Same
-- admin-role-check pattern already used on the products table.
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. Automatically cancel pending orders older than 24 hours (nothing was
-- ever reserved for a pending order, so this never needs to touch stock).
-- Adjust the interval below if you want a different cutoff.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cancel-stale-pending-orders',
  '0 * * * *', -- every hour, on the hour
  $$
    update public.orders
    set status = 'cancelled'
    where status = 'pending'
      and created_at < now() - interval '24 hours';
  $$
);
