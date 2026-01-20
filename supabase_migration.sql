
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  email text,
  subscribed boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile." on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- Create drawings table
create table public.drawings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  original_image_url text not null,
  analysis jsonb,
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on drawings
alter table public.drawings enable row level security;

create policy "Users can view their own drawings." on public.drawings
  for select using (auth.uid() = user_id);

create policy "Users can insert their own drawings." on public.drawings
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own drawings." on public.drawings
  for update using (auth.uid() = user_id);

-- Create orders table
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  drawing_id uuid references public.drawings,
  product_type text not null,
  total_amount int not null,
  status text not null,
  shipping_info jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on orders
alter table public.orders enable row level security;

create policy "Users can view their own orders." on public.orders
  for select using (auth.uid() = user_id);

create policy "Users can insert their own orders." on public.orders
  for insert with check (auth.uid() = user_id);

-- Create storage buckets
insert into storage.buckets (id, name, public) values ('drawings', 'drawings', true);
insert into storage.buckets (id, name, public) values ('outputs', 'outputs', true);

-- Storage policies
create policy "Public Access to drawings" on storage.objects for select using (bucket_id = 'drawings');
create policy "Users can upload drawings" on storage.objects for insert with check (bucket_id = 'drawings' AND auth.role() = 'authenticated');

create policy "Public Access to outputs" on storage.objects for select using (bucket_id = 'outputs');
create policy "Users can upload outputs" on storage.objects for insert with check (bucket_id = 'outputs' AND auth.role() = 'authenticated');

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
