-- Migration: Setup Image Upload Functionality
-- This migration sets up Supabase Storage for image uploads

-- Create storage bucket for prompt images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prompt-images',
  'prompt-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images',
  'category-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload images to prompt-images bucket
CREATE POLICY "Allow authenticated users to upload prompt images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prompt-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their own prompt images
CREATE POLICY "Allow users to update their own prompt images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'prompt-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their own prompt images
CREATE POLICY "Allow users to delete their own prompt images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'prompt-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow public read access to prompt images
CREATE POLICY "Allow public read access to prompt images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'prompt-images');

-- Policy: Allow authenticated users to upload category images
CREATE POLICY "Allow authenticated users to upload category images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'category-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update category images
CREATE POLICY "Allow users to update category images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'category-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete category images
CREATE POLICY "Allow users to delete category images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'category-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow public read access to category images
CREATE POLICY "Allow public read access to category images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'category-images');

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

-- Create trigger to cleanup images when prompts are deleted
CREATE TRIGGER cleanup_prompt_images_trigger
  AFTER DELETE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_prompt_images();

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

-- Create trigger to cleanup images when categories are deleted
CREATE TRIGGER cleanup_category_images_trigger
  AFTER DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_category_images();

-- Update prompts table to use image_url instead of primary_image_url for consistency
-- (This assumes the column exists, if not, you may need to add it)
-- ALTER TABLE public.prompts RENAME COLUMN primary_image_url TO image_url;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompts_image_url ON public.prompts(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_cover_image_url ON public.categories(cover_image_url) WHERE cover_image_url IS NOT NULL;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
