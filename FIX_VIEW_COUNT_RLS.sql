-- =====================================================
-- FIX VIEW COUNT RLS POLICIES
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- 1. First, check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'prompts';

-- 2. Check existing policies on prompts table
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'prompts';

-- 3. Drop existing policies that might be blocking updates (if any)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.prompts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.prompts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.prompts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.prompts;

-- 4. Create new comprehensive policies for prompts table

-- Allow everyone to read prompts
CREATE POLICY "Enable read access for all users" ON public.prompts
FOR SELECT USING (true);

-- Allow authenticated users to insert prompts
CREATE POLICY "Enable insert for authenticated users only" ON public.prompts
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow everyone to update view_count and copy_count (for tracking)
CREATE POLICY "Enable view count updates for all users" ON public.prompts
FOR UPDATE USING (true)
WITH CHECK (true);

-- Allow authenticated users to update their own prompts
CREATE POLICY "Enable update for users based on user_id" ON public.prompts
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own prompts
CREATE POLICY "Enable delete for users based on user_id" ON public.prompts
FOR DELETE USING (auth.uid() = user_id);

-- 5. Ensure RLS is enabled on prompts table
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- 6. Create or replace the increment_view_count function
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

-- 7. Create or replace the increment_copy_count function
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

-- 8. Grant execute permissions on the RPC functions
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_copy_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_copy_count(UUID) TO authenticated;

-- 9. Test the RPC function with a sample prompt
-- First, get a prompt ID to test with
SELECT id, title, view_count 
FROM public.prompts 
LIMIT 1;

-- 10. Test the increment function (replace 'YOUR_PROMPT_ID' with actual ID from step 9)
-- SELECT public.increment_view_count('YOUR_PROMPT_ID');

-- 11. Verify the update worked
-- SELECT id, title, view_count 
-- FROM public.prompts 
-- WHERE id = 'YOUR_PROMPT_ID';

-- 12. Check if user_interactions table has proper policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'user_interactions';

-- 13. Create policies for user_interactions table if needed
CREATE POLICY IF NOT EXISTS "Enable insert for all users" ON public.user_interactions
FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Enable read for all users" ON public.user_interactions
FOR SELECT USING (true);

-- 14. Final verification - check all policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename IN ('prompts', 'user_interactions')
ORDER BY tablename, policyname;

