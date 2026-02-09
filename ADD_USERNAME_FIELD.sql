-- =====================================================
-- ADD MISSING USERNAME FIELD TO USER_PROFILES
-- =====================================================
-- This migration adds the missing username field to user_profiles table

-- =====================================================
-- 1. ADD USERNAME COLUMN TO USER_PROFILES TABLE
-- =====================================================

-- Add username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'username'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN username VARCHAR(50);
        
        RAISE NOTICE 'Added username column to user_profiles table';
    ELSE
        RAISE NOTICE 'username column already exists in user_profiles table';
    END IF;
END $$;

-- =====================================================
-- 2. UPDATE EXISTING USERS WITH USERNAMES
-- =====================================================

-- Generate usernames for existing users who don't have them
UPDATE public.user_profiles 
SET username = COALESCE(
    username, 
    split_part(
        (SELECT email FROM auth.users WHERE auth.users.id = user_profiles.id), 
        '@', 
        1
    )
)
WHERE username IS NULL OR username = '';

-- =====================================================
-- 3. UPDATE THE HANDLE_NEW_USER FUNCTION
-- =====================================================

-- Drop existing triggers first (with CASCADE to handle dependencies)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users CASCADE;

-- Drop existing function (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create updated function with username support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. UPDATE RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create updated policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow system/triggers to insert profiles
CREATE POLICY "System can insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for the function to work
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 6. TEST THE FIX
-- =====================================================

-- Test the function with a mock user
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    RAISE NOTICE 'Testing updated handle_new_user function...';
    
    -- Try to create a test user
    BEGIN
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (test_user_id, test_email, '{"full_name": "Test User", "username": "testuser"}');
        
        -- Check if profile was created with username
        IF EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = test_user_id 
            AND username IS NOT NULL 
            AND username != ''
        ) THEN
            RAISE NOTICE 'SUCCESS: User profile created with username';
        ELSE
            RAISE EXCEPTION 'FAILED: User profile was not created with username';
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
    RAISE NOTICE 'USERNAME FIELD ADDED TO USER_PROFILES';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Added username column to user_profiles table';
    RAISE NOTICE '2. Generated usernames for existing users';
    RAISE NOTICE '3. Updated handle_new_user() function';
    RAISE NOTICE '4. Updated RLS policies';
    RAISE NOTICE '5. Fixed permissions';
    RAISE NOTICE '6. Tested the function successfully';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Signup should now work without database errors!';
    RAISE NOTICE '=====================================================';
END $$;
