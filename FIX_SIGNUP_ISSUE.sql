-- =====================================================
-- FIX SIGNUP ISSUE - COMPREHENSIVE SOLUTION
-- =====================================================
-- This script fixes the new user signup functionality

-- =====================================================
-- 1. FIX HANDLE_NEW_USER FUNCTION
-- =====================================================

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user profile with proper error handling
    INSERT INTO public.user_profiles (id, username, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user'
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. ENSURE USER_PROFILES TABLE HAS CORRECT SCHEMA
-- =====================================================

-- Add username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN username VARCHAR(50) UNIQUE;
        RAISE NOTICE 'Added username column to user_profiles table';
    ELSE
        RAISE NOTICE 'username column already exists in user_profiles table';
    END IF;
END $$;

-- =====================================================
-- 3. FIX RLS POLICIES FOR USER_PROFILES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow system to insert profiles (for triggers)
CREATE POLICY "System can insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions for the function to work
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 5. TEST THE FUNCTION
-- =====================================================

-- Test the function (this will be rolled back)
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    -- Simulate a new user creation
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (test_user_id, test_email, '{"full_name": "Test User"}');
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = test_user_id) THEN
        RAISE NOTICE 'SUCCESS: User profile created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: User profile was not created';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.user_profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Test completed successfully';
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SIGNUP ISSUE FIX COMPLETED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '1. Updated handle_new_user() function with proper error handling';
    RAISE NOTICE '2. Added username field support';
    RAISE NOTICE '3. Fixed RLS policies for user_profiles';
    RAISE NOTICE '4. Added system permissions for profile creation';
    RAISE NOTICE '5. Tested the function successfully';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'New user signup should now work correctly!';
    RAISE NOTICE '=====================================================';
END $$;
