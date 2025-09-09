-- =====================================================
-- COMPLETE SUPABASE SETUP FOR IMAGE UPLOAD FUNCTIONALITY
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- This sets up everything needed for image uploads

-- =====================================================
-- 1. CREATE STORAGE BUCKETS
-- =====================================================

-- Create bucket for prompt images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prompt-images',
  'prompt-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for category images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images',
  'category-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE STORAGE POLICIES FOR PROMPT IMAGES
-- =====================================================

-- Policy: Allow authenticated users to upload prompt images
CREATE POLICY "Allow authenticated users to upload prompt images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prompt-images');

-- Policy: Allow authenticated users to update prompt images
CREATE POLICY "Allow users to update prompt images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'prompt-images');

-- Policy: Allow authenticated users to delete prompt images
CREATE POLICY "Allow users to delete prompt images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'prompt-images');

-- Policy: Allow public read access to prompt images
CREATE POLICY "Allow public read access to prompt images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'prompt-images');

-- =====================================================
-- 4. CREATE STORAGE POLICIES FOR CATEGORY IMAGES
-- =====================================================

-- Policy: Allow authenticated users to upload category images
CREATE POLICY "Allow authenticated users to upload category images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-images');

-- Policy: Allow authenticated users to update category images
CREATE POLICY "Allow users to update category images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'category-images');

-- Policy: Allow authenticated users to delete category images
CREATE POLICY "Allow users to delete category images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'category-images');

-- Policy: Allow public read access to category images
CREATE POLICY "Allow public read access to category images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'category-images');

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get public URL for uploaded images
CREATE OR REPLACE FUNCTION public.get_image_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CONCAT(
    'https://',
    (SELECT value FROM pg_settings WHERE name = 'app.settings.api_url'),
    '/storage/v1/object/public/',
    bucket_name,
    '/',
    file_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned images when prompts are deleted
CREATE OR REPLACE FUNCTION public.cleanup_prompt_images()
RETURNS TRIGGER AS $$
DECLARE
  image_paths TEXT[];
BEGIN
  -- Collect all image paths from the deleted prompt
  SELECT ARRAY[
    OLD.image_url,
    OLD.before_image_url,
    OLD.after_image_url
  ] INTO image_paths;
  
  -- Remove empty/null values
  image_paths := ARRAY_REMOVE(image_paths, NULL);
  image_paths := ARRAY_REMOVE(image_paths, '');
  
  -- Delete images from storage if they exist
  IF array_length(image_paths, 1) > 0 THEN
    PERFORM storage.delete_object('prompt-images', image_paths);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up category images when categories are deleted
CREATE OR REPLACE FUNCTION public.cleanup_category_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete category cover image from storage if it exists
  IF OLD.cover_image_url IS NOT NULL AND OLD.cover_image_url != '' THEN
    PERFORM storage.delete_object('category-images', OLD.cover_image_url);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CREATE CLEANUP TRIGGERS
-- =====================================================

-- Create trigger to cleanup images when prompts are deleted
DROP TRIGGER IF EXISTS cleanup_prompt_images_trigger ON public.prompts;
CREATE TRIGGER cleanup_prompt_images_trigger
  AFTER DELETE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_prompt_images();

-- Create trigger to cleanup images when categories are deleted
DROP TRIGGER IF EXISTS cleanup_category_images_trigger ON public.categories;
CREATE TRIGGER cleanup_category_images_trigger
  AFTER DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_category_images();

-- =====================================================
-- 8. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompts_image_url ON public.prompts(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_before_image_url ON public.prompts(before_image_url) WHERE before_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_after_image_url ON public.prompts(after_image_url) WHERE after_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_cover_image_url ON public.categories(cover_image_url) WHERE cover_image_url IS NOT NULL;

-- =====================================================
-- 9. UPDATE PROMPTS TABLE SCHEMA (if needed)
-- =====================================================

-- Check if image_url column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Check if before_image_url column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND column_name = 'before_image_url'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN before_image_url TEXT;
    END IF;
END $$;

-- Check if after_image_url column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND column_name = 'after_image_url'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN after_image_url TEXT;
    END IF;
END $$;

-- Check if description column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN description TEXT;
    END IF;
END $$;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Verify buckets were created
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('prompt-images', 'category-images');

-- Verify policies were created
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'objects';

-- Verify columns exist in prompts table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'prompts' 
AND column_name IN ('image_url', 'before_image_url', 'after_image_url', 'description');

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- You should see:
-- 1. Two storage buckets created (prompt-images, category-images)
-- 2. Multiple storage policies created
-- 3. Helper functions created
-- 4. Cleanup triggers created
-- 5. Performance indexes added
-- 6. Database columns added if missing

-- Your image upload functionality is now ready!
