-- Manual Supabase Setup for Image Upload
-- Run this in your Supabase SQL Editor if the migration doesn't work

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prompt-images',
  'prompt-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images',
  'category-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create storage policies for prompt-images bucket
CREATE POLICY "Allow authenticated users to upload prompt images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prompt-images');

CREATE POLICY "Allow users to update their own prompt images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'prompt-images');

CREATE POLICY "Allow users to delete their own prompt images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'prompt-images');

CREATE POLICY "Allow public read access to prompt images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'prompt-images');

-- 4. Create storage policies for category-images bucket
CREATE POLICY "Allow authenticated users to upload category images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Allow users to update category images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'category-images');

CREATE POLICY "Allow users to delete category images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'category-images');

CREATE POLICY "Allow public read access to category images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'category-images');

-- 5. Grant permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
