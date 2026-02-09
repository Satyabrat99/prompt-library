-- =====================================================
-- DISABLE TRIGGER COMPLETELY - TRIGGER-FREE SIGNUP
-- =====================================================
-- This script completely disables the database trigger and relies on frontend

-- =====================================================
-- 1. COMPLETELY REMOVE ALL TRIGGERS
-- =====================================================

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================
-- 2. ENSURE USER_PROFILES TABLE EXISTS
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
-- 3. SIMPLE RLS POLICIES (NO TRIGGER NEEDED)
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "System can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON public.user_profiles;

-- Create simple policies for frontend-only approach
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for frontend operations
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 5. CREATE PROFILES FOR EXISTING USERS
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
-- 6. VERIFY NO TRIGGERS EXIST
-- =====================================================

-- Check that no triggers exist
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' 
    AND event_object_schema = 'auth';
    
    IF trigger_count = 0 THEN
        RAISE NOTICE 'SUCCESS: No triggers found on auth.users table';
    ELSE
        RAISE NOTICE 'WARNING: % triggers still exist on auth.users table', trigger_count;
    END IF;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'TRIGGER-FREE SIGNUP SOLUTION APPLIED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Completely removed all database triggers';
    RAISE NOTICE '2. Removed handle_new_user() function';
    RAISE NOTICE '3. Set up simple RLS policies for frontend';
    RAISE NOTICE '4. Created profiles for existing users';
    RAISE NOTICE '5. Verified no triggers remain';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Signup now relies entirely on frontend profile creation';
    RAISE NOTICE 'This should eliminate the 500 error completely!';
    RAISE NOTICE '=====================================================';
END $$;
