-- =====================================================
-- SIMPLE SIGNUP FIX - MINIMAL APPROACH
-- =====================================================
-- This script provides a minimal, reliable fix for the signup issue

-- =====================================================
-- 1. DISABLE EXISTING TRIGGER TEMPORARILY
-- =====================================================

-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users;

-- =====================================================
-- 2. CREATE SIMPLE USER_PROFILES TABLE IF MISSING
-- =====================================================

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50),
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE MINIMAL TRIGGER FUNCTION
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create minimal, reliable function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple insert with minimal data
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE TRIGGER
-- =====================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. SIMPLE RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "System can update profiles" ON public.user_profiles;

-- Create simple policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow inserts (for triggers and users)
CREATE POLICY "Allow profile inserts" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 7. TEST THE FIX
-- =====================================================

-- Test with a simple user creation
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    RAISE NOTICE 'Testing minimal signup fix...';
    
    -- Try to create a test user
    BEGIN
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (test_user_id, test_email, '{"full_name": "Test User"}');
        
        -- Check if profile was created
        IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = test_user_id) THEN
            RAISE NOTICE 'SUCCESS: User profile created successfully';
        ELSE
            RAISE EXCEPTION 'FAILED: User profile was not created';
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
-- 8. CREATE MISSING PROFILES FOR EXISTING USERS
-- =====================================================

-- Create profiles for users who don't have them
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
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MINIMAL SIGNUP FIX APPLIED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'This fix:';
    RAISE NOTICE '1. Removed complex trigger logic';
    RAISE NOTICE '2. Created minimal user profile creation';
    RAISE NOTICE '3. Added simple RLS policies';
    RAISE NOTICE '4. Fixed permissions';
    RAISE NOTICE '5. Created missing profiles for existing users';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Try signing up again - it should work now!';
    RAISE NOTICE '=====================================================';
END $$;
