-- =====================================================
-- FIX STORAGE POLICIES FOR IMAGE ACCESS
-- =====================================================

-- First, let's check what policies currently exist
SELECT * FROM storage.policies WHERE bucket_id = 'prompt-images';

-- =====================================================
-- DROP EXISTING POLICIES (if any)
-- =====================================================

DROP POLICY IF EXISTS "Prompt images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload prompt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own prompt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own prompt images" ON storage.objects;

-- =====================================================
-- CREATE NEW POLICIES FOR PUBLIC ACCESS
-- =====================================================

-- Allow public access to view images (this is the key one!)
CREATE POLICY "Public can view prompt images" ON storage.objects
    FOR SELECT USING (bucket_id = 'prompt-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload prompt images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'prompt-images' 
        AND auth.role() = 'authenticated'
    );

-- Allow users to update their own images
CREATE POLICY "Users can update own prompt images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'prompt-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own images
CREATE POLICY "Users can delete own prompt images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'prompt-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- VERIFY POLICIES WERE CREATED
-- =====================================================

SELECT * FROM storage.policies WHERE bucket_id = 'prompt-images';

-- =====================================================
-- TEST IMAGE ACCESS
-- =====================================================

-- Get the public URL for the existing image
SELECT 
    name,
    bucket_id,
    (storage.objects_get_public_url('prompt-images', name)).public_url as public_url
FROM storage.objects 
WHERE bucket_id = 'prompt-images' 
LIMIT 5;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'STORAGE POLICIES FIXED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Public access policy created for prompt-images bucket';
    RAISE NOTICE 'Images should now be accessible without authentication';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh your Explore page';
    RAISE NOTICE '2. Images should now display correctly';
    RAISE NOTICE '3. Check browser console for any remaining errors';
    RAISE NOTICE '=====================================================';
END $$;
