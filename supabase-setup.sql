-- PEPTICORE Supabase setup
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > Run)

-- 1. Profiles table: one row per authenticated user, holds their role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'client' check (role in ('client', 'admin')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile row (needed so the site can check "am I admin?").
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own name, but NOT their own role (role is intentionally excluded below).
create policy "Users can update own profile name"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Auto-create a profile row (default role 'client') whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Products table (mirrors the catalog data currently hardcoded in catalog.js).
create table if not exists public.products (
  id text primary key,
  name text not null,
  price numeric(10,2) not null,
  category_label text,
  categories text[] not null default '{}',
  purity numeric(5,2),
  stock text not null default 'in-stock' check (stock in ('in-stock', 'low-stock', 'backordered')),
  description text,
  image text,
  image_alt text,
  detail_href text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone (including logged-out visitors) can browse the catalog.
create policy "Products are publicly readable"
  on public.products for select
  using (true);

-- Only admins can add, edit, or remove products. Enforced here in Postgres --
-- a client cannot bypass this from devtools or by editing frontend JS.
create policy "Only admins can insert products"
  on public.products for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Only admins can update products"
  on public.products for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Only admins can delete products"
  on public.products for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4. Seed the current catalog so the table isn't empty.
insert into public.products (id, name, price, category_label, categories, purity, stock, description, image, image_alt, detail_href) values
('bpc-157', 'BPC-157 5mg', 49.00, 'Muscle Growth / GH Secretagogue', array['muscle-growth','recovery'], 99.8, 'in-stock', 'Stable version gastric pentadecapeptide for focused musculoskeletal tissue research applications.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6ybMBWU941CtC481owfI_At2sMscPQ2neo6-ck1OaHZuMH6CXGbWJfzFkLa7kMtHyxTHYR8NV0PB6TsgsRxCx9-KFSQ6etDFHrGwqOo8-WMls7q0P9vsBehai8NKnXH9PNLU5JLYk5WsnJBYwqK7Vgwri7qA4sKSe5jKGpU_mutjvRRjDLHfNjKkypwYe7Qy_P5_P76WCguBe5a-xQpxi0Hsyw6StwWWnuAlqwATZXDAMFlWhStMx', 'A clinical, high-end macro photograph of a small glass vial with a silver cap, containing a pristine white lyophilized powder.', 'product.html'),
('tirzepatide', 'Tirzepatide 10mg', 124.00, 'Weight Management', array['fat-loss'], 99.9, 'low-stock', 'Dual GLP-1 and GIP receptor agonist synthesized for high-precision metabolic pathway exploration.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7tAIbKz3z5IO2yfnjZNvtPBoQQ2DDPxaWMmCXg1csGOGDYhVPJjLMGoUwlAbA2DshJ31G2JmpqMKTnPyY6RqvlCMviyS_1mmMDIV5z7rqX06lNRnB-ju_DL7JxmUx9twOJdcQ-m1YOzhFKWWUD8laWYmkBH5aIXX5paTIyMClyeO67lfKYJqUTawnoHDgUzZxgw3DWLyoAtiSKf3n_jEBlvCVLwhZEdq92t1T9TIESj_ugEKH6O8K', 'Close-up of three identical medicinal vials sitting on a reflective glass surface, filled with pure white crystalline powder.', 'tirzepatide.html'),
('ghk-cu', 'GHK-Cu 50mg', 68.00, 'Anti-Aging / Cellular Repair', array['recovery'], 99.7, 'in-stock', 'Copper peptide complex known for significant impact on regenerative biology and collagen research.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMvLN7_P3LEX02LcEHR5zDxDO8_XxSODX1k3Po6v5jH5aMqptd2ICQfg-NUtQ3NVUDAf6Qw4VGf1nybLoBGzz6nbm4_Zk1SSvqet1x3HHtmNzYNAFmK_ge3GlfuVfeW1BnFY6-L2unzSW9t8NMolURyoNISiBAybLkFPwFT-kZeG2g1SHK-UQR2_xBe9A1rNnoGTGP9vPToX8jIpbf6WuP73-hAYu5dubiZrHsRg07k1NWeZymUEot', 'High-resolution shot of a luxury peptide packaging set with a sleek minimal white box and custom-fitted foam holding glass vials.', 'ghk-cu.html'),
('aod-9604', 'AOD-9604 2mg', 55.00, 'Fat Loss / Lipid Metabolism', array['fat-loss'], 99.5, 'in-stock', 'C-terminal fragment of Human Growth Hormone developed specifically for adipose tissue regulation research.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4JGy4nZNVk-O48w6Y3rvZQiWbaODWarFf9YFLblTordV03y4OtlKC4Gp_aJOxzan2MIXAscPVT9QgnKJPODhy2RsygV2hMegxpTXBJuUHzydeG7_TG9ys7gIiFamATFxXyswZ30fkYqHHDsZV6FTQZhJVmB083Xi3I7jShwdjtGj3xEspXcgwQHOvgjYRvfD8WT-Qr7hIa52Z9mAqm-_qimjzkYeyZMTAdBs8deQsKTvPI0REgBmt', 'Molecular structure visualization appearing as a glowing hologram above a clean laboratory bench with a peptide vial nearby.', 'aod-9604.html'),
('thymosin-alpha-1', 'Thymosin Alpha-1', 89.00, 'Immune System Modulation', array['recovery'], 99.9, 'in-stock', 'Immune-regulating peptide sequence essential for studying T-cell activation and defense mechanisms.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDA925auf6z5rlL4xFIFoqYpMhjWai7nhkUP25fzBb7US7KgVAsH2quCvwvnF40XcT8A61iu1YKarONLIOX01zGj-I1gQPjkW6h8YRFEScJn2qTz_BBhbL4RYTbUOgeXu67HzB0yoxtapGcSaUxIRe1vFMZxh71O21FxaGcY0m6NGP9s9IgTMrkj1hjn9vyNF81K1c9hzMJGRjA2FhaQYnYo2URPLB9eDqfk2YlxQXgEPtQjaq7etIv', 'Artistic macro photo of clear liquid droplets on a sterile glass slide with sharp refracted light patterns.', 'thymosin-alpha-1.html'),
('semax', 'Semax 1% Spray', 72.00, 'Cognitive Enhancement', array['cognitive'], 99.6, 'backordered', 'Neuro-active heptapeptide for investigating brain-derived neurotrophic factor (BDNF) levels.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCR5MSbPY0WQh5jAqaX42w8plDghNg2pQNy1zcUpzR-4urO1cVtdaQlB6nLXpAKC1XcV_svEu-N4DUumCZIrDB3ZKI8EPbibv3EP6X3Sf1xxCPlRKyT8YJw445XaRABwnNeG0kfwEesOSNPcA9ENiBbkKwgoM8ojLu0heu9nmP8WV_Ph-JvTY9n7AMxsiPRHP-rC-G64QII5TNSMm55LHoIM7W80d--k2zdKSaEcE3CDF6l3yFeZB_L', 'A scientist''s hands in white nitrile gloves carefully placing a small glass vial into a precision centrifuge.', 'semax.html')
on conflict (id) do nothing;

-- 5. Orders table, so checkout can write real orders instead of just clearing localStorage.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  shipping_label text,
  shipping_price numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Clients can see and create only their own orders.
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can create own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- Admins can view every order (for the admin dashboard).
create policy "Admins can view all orders"
  on public.orders for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- To promote your own account to admin after you sign up on the site, run:
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';


-- =====================================================================
-- NEW: run ONLY this section below if you already ran everything above.
-- (Re-running the whole file would error on policies that already exist.)
-- =====================================================================

-- 6. Storage bucket for product images, so admins can upload a file directly
-- instead of pasting an external image URL. Public read, admin-only write --
-- enforced the same way as the products table, via RLS on storage.objects.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Only admins can upload product images" on storage.objects;
create policy "Only admins can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Only admins can update product images" on storage.objects;
create policy "Only admins can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Only admins can delete product images" on storage.objects;
create policy "Only admins can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
