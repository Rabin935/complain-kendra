-- Base complaints table for Complain Kendra.

create extension if not exists "uuid-ossp";
create extension if not exists postgis;

create table if not exists public.complaints (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade not null,
  title text not null,
  description text not null,
  category text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
