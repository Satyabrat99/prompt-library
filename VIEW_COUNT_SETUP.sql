-- =====================================================
-- VIEW COUNT SETUP FOR PROMPTS TABLE
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- 1. Add view_count column to prompts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND column_name = 'view_count'
    ) THEN
        ALTER TABLE public.prompts 
        ADD COLUMN view_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Add copy_count column to prompts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND column_name = 'copy_count'
    ) THEN
        ALTER TABLE public.prompts 
        ADD COLUMN copy_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Update existing prompts to have view_count = 0 if NULL
UPDATE public.prompts 
SET view_count = 0 
WHERE view_count IS NULL;

-- 4. Update existing prompts to have copy_count = 0 if NULL
UPDATE public.prompts 
SET copy_count = 0 
WHERE copy_count IS NULL;

-- 5. Create RPC function for incrementing view count (optional - for future use)
CREATE OR REPLACE FUNCTION public.increment_view_count(prompt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.prompts 
    SET view_count = COALESCE(view_count, 0) + 1,
        updated_at = NOW()
    WHERE id = prompt_id;
END;
$$;

-- 6. Create RPC function for incrementing copy count (optional - for future use)
CREATE OR REPLACE FUNCTION public.increment_copy_count(prompt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.prompts 
    SET copy_count = COALESCE(copy_count, 0) + 1,
        updated_at = NOW()
    WHERE id = prompt_id;
END;
$$;

-- 7. Grant execute permissions on the RPC functions
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_copy_count(UUID) TO authenticated;

-- 8. Create index on view_count for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_prompts_view_count ON public.prompts(view_count DESC);

-- 9. Create index on copy_count for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_prompts_copy_count ON public.prompts(copy_count DESC);

-- 10. Verify the columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prompts' 
AND column_name IN ('view_count', 'copy_count')
ORDER BY column_name;

-- 11. Check current prompts and their view/copy counts
SELECT 
    id,
    title,
    view_count,
    copy_count,
    created_at
FROM public.prompts 
ORDER BY created_at DESC 
LIMIT 10;
