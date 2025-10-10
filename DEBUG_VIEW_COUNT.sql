-- =====================================================
-- DEBUG VIEW COUNT ISSUES
-- Run these queries in Supabase SQL Editor to debug
-- =====================================================

-- 1. Check if view_count column exists and has data
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prompts' 
AND column_name = 'view_count';

-- 2. Check current view counts for all prompts
SELECT 
    id,
    title,
    view_count,
    copy_count,
    created_at
FROM public.prompts 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Test updating a specific prompt's view count
-- Replace 'YOUR_PROMPT_ID_HERE' with an actual prompt ID from step 2
UPDATE public.prompts 
SET view_count = COALESCE(view_count, 0) + 1
WHERE id = 'YOUR_PROMPT_ID_HERE'
RETURNING id, title, view_count;

-- 4. Check RLS policies on prompts table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'prompts';

-- 5. Check if prompts table allows updates
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name = 'prompts' 
AND privilege_type = 'UPDATE';

-- 6. Test a simple update to see if RLS is blocking
-- This should work if RLS is configured correctly
UPDATE public.prompts 
SET view_count = 1
WHERE id IN (
    SELECT id FROM public.prompts LIMIT 1
)
RETURNING id, title, view_count;

-- 7. Check if there are any triggers on the prompts table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'prompts';

-- 8. Verify the prompts table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'prompts'
ORDER BY ordinal_position;

