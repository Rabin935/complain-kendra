alter table public.complaints
  add column if not exists location geography(Point, 4326),
  add column if not exists address text,
  add column if not exists photos text[],
  add column if not exists status text default 'pending',
  add column if not exists admin_notes text;

alter table public.complaints
  drop constraint if exists complaints_category_check,
  drop constraint if exists complaints_status_check,
  add constraint complaints_category_check check (
    category in ('Road', 'Garbage', 'Water', 'Electricity', 'Street Light', 'Other')
  ),
  add constraint complaints_status_check check (
    status in ('pending', 'in-progress', 'resolved')
  );
