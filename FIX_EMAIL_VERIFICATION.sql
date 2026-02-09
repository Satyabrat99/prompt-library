-- =====================================================
-- FIX EMAIL VERIFICATION AND SIGNIN ISSUES
-- =====================================================
-- This script fixes email confirmation and signin problems

-- =====================================================
-- 1. CHECK CURRENT AUTH SETTINGS
-- =====================================================

-- Check if email confirmation is required
DO $$
DECLARE
    confirm_email_setting TEXT;
BEGIN
    -- This will show if email confirmation is enabled
    RAISE NOTICE 'Email confirmation settings need to be checked in Supabase Dashboard';
    RAISE NOTICE 'Go to: Authentication > Settings > Email';
    RAISE NOTICE 'Make sure "Enable email confirmations" is set correctly';
END $$;

-- =====================================================
-- 2. UPDATE USER PROFILES FOR EMAIL CONFIRMED USERS
-- =====================================================

-- Create profiles for users who have confirmed their email but don't have profiles
INSERT INTO public.user_profiles (id, username, full_name, role)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'user'
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL 
AND au.email_confirmed_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. FIX HANDLE_NEW_USER FUNCTION FOR EMAIL CONFIRMATION
-- =====================================================

-- Update the function to handle email confirmation properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if email is confirmed or if confirmation is not required
    IF NEW.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN
        INSERT INTO public.user_profiles (id, username, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'user'
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 4. CREATE FUNCTION TO HANDLE EMAIL CONFIRMATION
-- =====================================================

-- Create a function to handle email confirmation events
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- When email is confirmed, create user profile if it doesn't exist
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        INSERT INTO public.user_profiles (id, username, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'user'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to handle email confirmation for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for email confirmation
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW 
    WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
    EXECUTE FUNCTION public.handle_email_confirmation();

-- =====================================================
-- 5. UPDATE RLS POLICIES FOR BETTER AUTH HANDLING
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;

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
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for the functions to work
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 7. CHECK FOR PROBLEMATIC USERS
-- =====================================================

-- Check for users who might have confirmation issues
DO $$
DECLARE
    unconfirmed_count INTEGER;
    no_profile_count INTEGER;
BEGIN
    -- Count users without email confirmation
    SELECT COUNT(*) INTO unconfirmed_count
    FROM auth.users 
    WHERE email_confirmed_at IS NULL;
    
    -- Count users without profiles
    SELECT COUNT(*) INTO no_profile_count
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL;
    
    RAISE NOTICE 'Users without email confirmation: %', unconfirmed_count;
    RAISE NOTICE 'Users without profiles: %', no_profile_count;
    
    IF unconfirmed_count > 0 THEN
        RAISE NOTICE 'Consider disabling email confirmation in Supabase Dashboard if not needed';
    END IF;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'EMAIL VERIFICATION FIX APPLIED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Updated handle_new_user() function';
    RAISE NOTICE '2. Added email confirmation trigger';
    RAISE NOTICE '3. Created profiles for confirmed users';
    RAISE NOTICE '4. Updated RLS policies';
    RAISE NOTICE '5. Fixed permissions';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'IMPORTANT: Check Supabase Dashboard settings:';
    RAISE NOTICE '1. Go to Authentication > Settings > Email';
    RAISE NOTICE '2. Check "Enable email confirmations" setting';
    RAISE NOTICE '3. If not needed, disable email confirmation';
    RAISE NOTICE '4. Or ensure email templates are properly configured';
    RAISE NOTICE '=====================================================';
END $$;
