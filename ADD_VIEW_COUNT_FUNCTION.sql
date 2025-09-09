-- =====================================================
-- ADD VIEW COUNT FUNCTION AND TRIGGERS
-- =====================================================

-- =====================================================
-- 1. CREATE INCREMENT VIEW COUNT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_view_count(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.prompts
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE INCREMENT COPY COUNT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_copy_count(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.prompts
    SET copy_count = COALESCE(copy_count, 0) + 1
    WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. ENSURE VIEW_COUNT AND COPY_COUNT COLUMNS EXIST
-- =====================================================

-- Add view_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'view_count'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN view_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added view_count column to prompts table';
    ELSE
        RAISE NOTICE 'view_count column already exists in prompts table';
    END IF;
END $$;

-- Add copy_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'copy_count'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN copy_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added copy_count column to prompts table';
    ELSE
        RAISE NOTICE 'copy_count column already exists in prompts table';
    END IF;
END $$;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_copy_count(UUID) TO anon, authenticated;

-- =====================================================
-- 5. TEST THE FUNCTIONS
-- =====================================================

-- Test increment view count (replace with actual prompt ID)
-- SELECT public.increment_view_count('your-prompt-id-here');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'VIEW COUNT FUNCTIONS ADDED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'increment_view_count() function created';
    RAISE NOTICE 'increment_copy_count() function created';
    RAISE NOTICE 'view_count and copy_count columns ensured';
    RAISE NOTICE 'Permissions granted to anon and authenticated users';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. View counts will now increment when prompts are viewed';
    RAISE NOTICE '2. Copy counts will increment when prompts are copied';
    RAISE NOTICE '3. Check the Explore page - view counts should work';
    RAISE NOTICE '=====================================================';
END $$;
