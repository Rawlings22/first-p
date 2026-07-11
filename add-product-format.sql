alter table public.products
  add column if not exists format text not null default 'lyophilized'
  check (format in ('lyophilized', 'nasal-spray', 'premixed'));

update public.products set format = 'nasal-spray' where id = 'semax';
