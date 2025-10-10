-- =====================================================
-- FIX STORAGE ACCESS - SIMPLE APPROACH
-- =====================================================

-- =====================================================
-- 1. ENSURE BUCKET EXISTS AND IS PUBLIC
-- =====================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('prompt-images', 'prompt-images', true)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    name = 'prompt-images';

-- =====================================================
-- 2. CHECK CURRENT BUCKET STATUS
-- =====================================================

SELECT 
    id, 
    name, 
    public, 
    created_at 
FROM storage.buckets 
WHERE id = 'prompt-images';

-- =====================================================
-- 3. CHECK EXISTING FILES IN BUCKET
-- =====================================================

SELECT 
    name,
    bucket_id,
    size,
    created_at
FROM storage.objects 
WHERE bucket_id = 'prompt-images' 
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 4. TEST PUBLIC URL GENERATION
-- =====================================================

-- Get public URLs for existing files (using correct function)
SELECT 
    name,
    (storage.objects_get_public_url('prompt-images', name)).public_url as public_url
FROM storage.objects 
WHERE bucket_id = 'prompt-images' 
LIMIT 5;

-- =====================================================
-- 5. CHECK PROMPTS TABLE FOR IMAGE URLS
-- =====================================================

SELECT 
    id,
    title,
    primary_image_url,
    created_at
FROM public.prompts 
WHERE primary_image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- 6. UPDATE BUCKET TO BE PUBLIC (if not already)
-- =====================================================

UPDATE storage.buckets 
SET public = true 
WHERE id = 'prompt-images';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'STORAGE ACCESS FIXED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Bucket prompt-images is now public';
    RAISE NOTICE 'Images should be accessible via public URLs';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Check the public URLs above';
    RAISE NOTICE '2. Test them in your browser';
    RAISE NOTICE '3. Refresh your Explore page';
    RAISE NOTICE '4. Images should now display';
    RAISE NOTICE '=====================================================';
END $$;
