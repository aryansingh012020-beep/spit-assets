-- ============================================================
-- SPIT Asset Management System — Migration 011: Storage & Photo Policies
-- ============================================================

-- Ensure the asset-photos storage bucket exists and is public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'asset-photos',
  'asset-photos',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];

-- 1. Storage Objects: Public read access
drop policy if exists "Public Access to asset-photos" on storage.objects;
create policy "Public Access to asset-photos"
  on storage.objects for select
  using (bucket_id = 'asset-photos');

-- 2. Storage Objects: Authenticated users can upload asset photos
drop policy if exists "Authenticated users can upload asset photos" on storage.objects;
create policy "Authenticated users can upload asset photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'asset-photos');

-- 3. Storage Objects: Authenticated users can update asset photos
drop policy if exists "Authenticated users can update asset photos" on storage.objects;
create policy "Authenticated users can update asset photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'asset-photos');

-- 4. Storage Objects: Authenticated users can delete asset photos
drop policy if exists "Authenticated users can delete asset photos" on storage.objects;
create policy "Authenticated users can delete asset photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'asset-photos');

-- 5. Ensure asset_photos table is readable by all authenticated users
drop policy if exists "asset_photos_select_authenticated" on public.asset_photos;
create policy "asset_photos_select_authenticated"
  on public.asset_photos for select
  using (auth.uid() is not null);
