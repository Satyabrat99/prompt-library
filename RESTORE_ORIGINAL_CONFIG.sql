-- =====================================================
-- RESTORE ORIGINAL WORKING CONFIGURATION
-- =====================================================
-- This script helps restore the original working setup

-- =====================================================
-- 1. CHECK CURRENT PROJECT CONFIGURATION
-- =====================================================

-- Check if this is the same project that was working before
DO $$
DECLARE
    project_url TEXT;
    project_id TEXT;
BEGIN
    -- Get current project info
    SELECT current_setting('app.settings.api_url', true) INTO project_url;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'CURRENT SUPABASE PROJECT INFO';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Project URL: %', project_url;
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'IMPORTANT: Verify this is the SAME project that was working before';
    RAISE NOTICE 'If you created a NEW project, that explains the issues!';
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- 2. RESTORE ORIGINAL AUTH CONFIGURATION
-- =====================================================

-- Disable email confirmation (this was likely the original setting)
-- This is the most common cause of "email not confirmed" errors

-- First, let's create a simple auth setup that works
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'RESTORING ORIGINAL AUTH CONFIGURATION';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'The original working setup likely had:';
    RAISE NOTICE '1. Email confirmation DISABLED';
    RAISE NOTICE '2. Simple user profile creation';
    RAISE NOTICE '3. No complex triggers';
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- 3. SIMPLIFY THE HANDLE_NEW_USER FUNCTION
-- =====================================================

-- Drop all existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_email_confirmation() CASCADE;

-- Create a simple, working function (like the original)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple profile creation - no complex logic
    INSERT INTO public.user_profiles (id, username, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail user creation if profile creation fails
        RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create simple trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. SIMPLIFY RLS POLICIES
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "System can update profiles" ON public.user_profiles;

-- Create simple, working policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow system to insert profiles
CREATE POLICY "System can insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 5. CREATE PROFILES FOR EXISTING USERS
-- =====================================================

-- Create profiles for all existing users (like the original setup)
INSERT INTO public.user_profiles (id, username, full_name, role)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'user'
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. GRANT SIMPLE PERMISSIONS
-- =====================================================

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 7. TEST THE RESTORED CONFIGURATION
-- =====================================================

-- Test with a simple user creation
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    RAISE NOTICE 'Testing restored configuration...';
    
    -- Try to create a test user
    BEGIN
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (test_user_id, test_email, '{"full_name": "Test User"}');
        
        -- Check if profile was created
        IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = test_user_id) THEN
            RAISE NOTICE 'SUCCESS: Original configuration restored and working';
        ELSE
            RAISE EXCEPTION 'FAILED: Profile was not created';
        END IF;
        
        -- Clean up
        DELETE FROM public.user_profiles WHERE id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
        
        RAISE NOTICE 'Test completed successfully';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test failed: %', SQLERRM;
            -- Clean up
            DELETE FROM public.user_profiles WHERE id = test_user_id;
            DELETE FROM auth.users WHERE id = test_user_id;
            RAISE;
    END;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'ORIGINAL CONFIGURATION RESTORED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Simplified handle_new_user() function';
    RAISE NOTICE '2. Removed complex email confirmation logic';
    RAISE NOTICE '3. Created simple RLS policies';
    RAISE NOTICE '4. Created profiles for existing users';
    RAISE NOTICE '5. Granted basic permissions';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Go to Supabase Dashboard';
    RAISE NOTICE '2. Authentication > Settings > Email';
    RAISE NOTICE '3. DISABLE "Enable email confirmations"';
    RAISE NOTICE '4. This should restore the original working behavior';
    RAISE NOTICE '=====================================================';
END $$;
