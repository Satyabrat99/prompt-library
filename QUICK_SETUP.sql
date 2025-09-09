-- =====================================================
-- QUICK SUPABASE SETUP FOR IMAGE UPLOAD
-- =====================================================
-- Run this in Supabase SQL Editor for quick setup

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('prompt-images', 'prompt-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create storage policies
CREATE POLICY "Allow authenticated users to upload prompt images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prompt-images');
CREATE POLICY "Allow users to update prompt images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'prompt-images');
CREATE POLICY "Allow users to delete prompt images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'prompt-images');
CREATE POLICY "Allow public read access to prompt images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'prompt-images');

CREATE POLICY "Allow authenticated users to upload category images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'category-images');
CREATE POLICY "Allow users to update category images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'category-images');
CREATE POLICY "Allow users to delete category images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'category-images');
CREATE POLICY "Allow public read access to category images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'category-images');

-- 4. Grant permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- 5. Add missing columns to prompts table
ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS before_image_url TEXT;
ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS after_image_url TEXT;
ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS description TEXT;

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_prompts_image_url ON public.prompts(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_before_image_url ON public.prompts(before_image_url) WHERE before_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_after_image_url ON public.prompts(after_image_url) WHERE after_image_url IS NOT NULL;

-- Setup complete! Your image upload should now work.
