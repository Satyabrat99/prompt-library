-- =====================================================
-- DEBUG STORAGE SETUP - CHECK BUCKET AND POLICIES
-- =====================================================

-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'prompt-images';

-- Check storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'prompt-images';

-- Check if there are any files in the bucket
SELECT * FROM storage.objects WHERE bucket_id = 'prompt-images' LIMIT 10;

-- Check prompts table for image URLs
SELECT id, title, primary_image_url, created_at 
FROM public.prompts 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if primary_image_url column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prompts' 
AND column_name LIKE '%image%';

-- Check recent prompts with all image fields
SELECT 
  id, 
  title, 
  primary_image_url, 
  before_image_url, 
  after_image_url,
  created_at
FROM public.prompts 
ORDER BY created_at DESC 
LIMIT 3;
