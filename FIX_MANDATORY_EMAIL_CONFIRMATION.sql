-- =====================================================
-- FIX MANDATORY EMAIL CONFIRMATION FLOW
-- =====================================================
-- This script fixes the email confirmation flow for newer Supabase versions

-- =====================================================
-- 1. UPDATE HANDLE_NEW_USER FOR EMAIL CONFIRMATION
-- =====================================================

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_email_confirmation() CASCADE;

-- Create function that handles email confirmation properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Don't create profile immediately - wait for email confirmation
    -- This prevents the "email not confirmed" error
    RAISE NOTICE 'New user created: % (email: %)', NEW.id, NEW.email;
    RAISE NOTICE 'Email confirmed: %', NEW.email_confirmed_at;
    
    -- Only create profile if email is already confirmed (shouldn't happen on signup)
    IF NEW.email_confirmed_at IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, username, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'user'
        );
        RAISE NOTICE 'Profile created for confirmed user: %', NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to handle new user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. CREATE EMAIL CONFIRMATION HANDLER
-- =====================================================

-- Create function to handle email confirmation
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- When email gets confirmed, create the user profile
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        RAISE NOTICE 'Email confirmed for user: %', NEW.id;
        
        INSERT INTO public.user_profiles (id, username, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'user'
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Profile created for confirmed user: %', NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to handle email confirmation for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for email confirmation
CREATE TRIGGER on_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW 
    WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
    EXECUTE FUNCTION public.handle_email_confirmation();

-- =====================================================
-- 3. CREATE PROFILES FOR EXISTING CONFIRMED USERS
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
-- 4. UPDATE RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;

-- Create policies that work with email confirmation
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

-- Grant permissions for the functions to work
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 6. CHECK CURRENT STATUS
-- =====================================================

-- Check current users and their confirmation status
DO $$
DECLARE
    total_users INTEGER;
    confirmed_users INTEGER;
    users_with_profiles INTEGER;
    unconfirmed_users INTEGER;
BEGIN
    -- Count users
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO confirmed_users FROM auth.users WHERE email_confirmed_at IS NOT NULL;
    SELECT COUNT(*) INTO users_with_profiles FROM auth.users au INNER JOIN public.user_profiles up ON au.id = up.id;
    SELECT COUNT(*) INTO unconfirmed_users FROM auth.users WHERE email_confirmed_at IS NULL;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'EMAIL CONFIRMATION STATUS';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Confirmed users: %', confirmed_users;
    RAISE NOTICE 'Unconfirmed users: %', unconfirmed_users;
    RAISE NOTICE 'Users with profiles: %', users_with_profiles;
    RAISE NOTICE '=====================================================';
    
    IF unconfirmed_users > 0 THEN
        RAISE NOTICE 'IMPORTANT: % users need to confirm their email', unconfirmed_users;
        RAISE NOTICE 'They will get "email not confirmed" error until they do';
    END IF;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'EMAIL CONFIRMATION FLOW FIXED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Updated handle_new_user() to wait for email confirmation';
    RAISE NOTICE '2. Created email confirmation handler';
    RAISE NOTICE '3. Created profiles for existing confirmed users';
    RAISE NOTICE '4. Updated RLS policies';
    RAISE NOTICE '5. Fixed permissions';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Email Templates';
    RAISE NOTICE '2. Configure "Confirm signup" template';
    RAISE NOTICE '3. Set redirect URL to: http://localhost:8080/';
    RAISE NOTICE '4. Test the email confirmation flow';
    RAISE NOTICE '=====================================================';
END $$;
