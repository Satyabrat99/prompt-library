-- =====================================================
-- SIMPLE STORAGE CHECK - NO COMPLEX FUNCTIONS
-- =====================================================

-- =====================================================
-- 1. CHECK BUCKET STATUS
-- =====================================================

SELECT 
    id, 
    name, 
    public, 
    created_at 
FROM storage.buckets 
WHERE id = 'prompt-images';

-- =====================================================
-- 2. CHECK FILES IN BUCKET
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
-- 3. CHECK PROMPTS WITH IMAGES
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
-- 4. ENSURE BUCKET IS PUBLIC
-- =====================================================

UPDATE storage.buckets 
SET public = true 
WHERE id = 'prompt-images';

-- =====================================================
-- 5. VERIFY BUCKET IS NOW PUBLIC
-- =====================================================

SELECT 
    id, 
    name, 
    public, 
    created_at 
FROM storage.buckets 
WHERE id = 'prompt-images';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'STORAGE CHECK COMPLETE!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Bucket prompt-images is now public';
    RAISE NOTICE 'Check the results above to see:';
    RAISE NOTICE '1. Bucket status (should be public=true)';
    RAISE NOTICE '2. Files in bucket';
    RAISE NOTICE '3. Prompts with image URLs';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Check if bucket is public=true';
    RAISE NOTICE '2. Check if you have prompts with primary_image_url';
    RAISE NOTICE '3. If both are good, refresh Explore page';
    RAISE NOTICE '4. Images should now display';
    RAISE NOTICE '=====================================================';
END $$;
