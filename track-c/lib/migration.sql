-- migration.sql
-- Run this in the Supabase SQL Editor for your project

-- Create profiles table
create table if not exists public.profiles (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create policy for profiles
create policy "Users can view and edit their own profile"
  on public.profiles
  for all
  using (auth.jwt()->>'sub' = id)
  with check (auth.jwt()->>'sub' = id);

-- Create diagnosis table
create table if not exists public.diagnosis (
  id uuid primary key default gen_random_uuid(),
  user_id text default (auth.jwt()->>'sub') not null,
  intake_raw jsonb not null,
  model text not null,
  prompt_version text not null,
  taxonomy_version text not null,
  raw_model_output jsonb,
  abstained boolean not null default false,
  refused boolean not null default false,
  evidence text,
  bottleneck text,
  prediction text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on diagnosis
alter table public.diagnosis enable row level security;

-- Create policy for diagnosis
create policy "Users can perform all actions on their own diagnoses"
  on public.diagnosis
  for all
  using (auth.jwt()->>'sub' = user_id)
  with check (auth.jwt()->>'sub' = user_id);

-- Create outcome table
create table if not exists public.outcome (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid references public.diagnosis(id) on delete cascade not null,
  did_what text not null,
  matched_prediction boolean not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on outcome
alter table public.outcome enable row level security;

-- Create policy for outcome
create policy "Users can perform all actions on outcomes of their own diagnoses"
  on public.outcome
  for all
  using (
    exists (
      select 1 from public.diagnosis d
      where d.id = diagnosis_id and d.user_id = auth.jwt()->>'sub'
    )
  );
