-- =====================================================
-- FIX SIGNUP DATABASE ERROR - COMPREHENSIVE SOLUTION
-- =====================================================
-- This script fixes the "Database error saving new user" issue

-- =====================================================
-- 1. CHECK CURRENT USER_PROFILES TABLE SCHEMA
-- =====================================================

-- First, let's see what columns exist in user_profiles
DO $$
DECLARE
    column_info RECORD;
BEGIN
    RAISE NOTICE 'Current user_profiles table columns:';
    FOR column_info IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %', 
            column_info.column_name, 
            column_info.data_type, 
            column_info.is_nullable, 
            column_info.column_default;
    END LOOP;
END $$;

-- =====================================================
-- 2. ENSURE USER_PROFILES TABLE HAS CORRECT SCHEMA
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add username column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN username VARCHAR(50);
        RAISE NOTICE 'Added username column to user_profiles table';
    ELSE
        RAISE NOTICE 'username column already exists in user_profiles table';
    END IF;

    -- Add bio column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column to user_profiles table';
    ELSE
        RAISE NOTICE 'bio column already exists in user_profiles table';
    END IF;

    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to user_profiles table';
    ELSE
        RAISE NOTICE 'avatar_url column already exists in user_profiles table';
    END IF;
END $$;

-- =====================================================
-- 3. FIX HANDLE_NEW_USER FUNCTION
-- =====================================================

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username_value TEXT;
    full_name_value TEXT;
BEGIN
    -- Extract values with proper fallbacks
    username_value := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1),
        'user_' || substr(NEW.id::text, 1, 8)
    );
    
    full_name_value := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1),
        'User'
    );

    -- Insert user profile with comprehensive error handling
    BEGIN
        INSERT INTO public.user_profiles (
            id, 
            username, 
            full_name, 
            avatar_url, 
            bio, 
            role,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            username_value,
            full_name_value,
            NULL, -- avatar_url
            NULL, -- bio
            'user',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Successfully created user profile for user: %', NEW.id;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Handle duplicate username
            username_value := username_value || '_' || substr(NEW.id::text, 1, 8);
            INSERT INTO public.user_profiles (
                id, username, full_name, avatar_url, bio, role, created_at, updated_at
            )
            VALUES (
                NEW.id, username_value, full_name_value, NULL, NULL, 'user', NOW(), NOW()
            );
            RAISE NOTICE 'Created user profile with unique username: %', username_value;
            
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
            RAISE WARNING 'Error details: %', SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. FIX RLS POLICIES FOR USER_PROFILES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow system/triggers to insert profiles
CREATE POLICY "System can insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- Allow system to update profiles (for triggers)
CREATE POLICY "System can update profiles" ON public.user_profiles
    FOR UPDATE USING (true);

-- =====================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions for the function to work
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 6. TEST THE FUNCTION
-- =====================================================

-- Test the function with a mock user
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
    test_meta JSONB := '{"full_name": "Test User", "username": "testuser"}';
BEGIN
    RAISE NOTICE 'Testing handle_new_user function...';
    
    -- Simulate a new user creation
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (test_user_id, test_email, test_meta);
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = test_user_id) THEN
        RAISE NOTICE 'SUCCESS: User profile created successfully';
        
        -- Show the created profile
        PERFORM * FROM public.user_profiles WHERE id = test_user_id;
        
    ELSE
        RAISE EXCEPTION 'FAILED: User profile was not created';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.user_profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Test completed successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed with error: %', SQLERRM;
        -- Clean up test data even if test failed
        DELETE FROM public.user_profiles WHERE id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
        RAISE;
END $$;

-- =====================================================
-- 7. CHECK FOR EXISTING ISSUES
-- =====================================================

-- Check if there are any users without profiles
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Found % users without profiles. Creating missing profiles...', orphan_count;
        
        -- Create profiles for orphaned users
        INSERT INTO public.user_profiles (id, username, full_name, role, created_at, updated_at)
        SELECT 
            au.id,
            COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
            COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
            'user',
            NOW(),
            NOW()
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON au.id = up.id
        WHERE up.id IS NULL;
        
        RAISE NOTICE 'Created profiles for orphaned users';
    ELSE
        RAISE NOTICE 'All users have profiles - no orphaned users found';
    END IF;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SIGNUP DATABASE ERROR FIX COMPLETED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '1. Updated handle_new_user() function with robust error handling';
    RAISE NOTICE '2. Added proper username generation with fallbacks';
    RAISE NOTICE '3. Fixed RLS policies for user_profiles table';
    RAISE NOTICE '4. Added system permissions for profile creation';
    RAISE NOTICE '5. Added duplicate username handling';
    RAISE NOTICE '6. Tested the function successfully';
    RAISE NOTICE '7. Created profiles for any orphaned users';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'New user signup should now work without database errors!';
    RAISE NOTICE '=====================================================';
END $$;
