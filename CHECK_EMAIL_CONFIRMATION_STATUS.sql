-- =====================================================
-- CHECK EMAIL CONFIRMATION STATUS
-- =====================================================
-- This script checks the current email confirmation status

-- =====================================================
-- 1. CHECK CURRENT USERS AND THEIR CONFIRMATION STATUS
-- =====================================================

-- Show all users and their email confirmation status
SELECT 
    id,
    email,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN 'CONFIRMED'
        ELSE 'NOT CONFIRMED'
    END as confirmation_status,
    created_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- 2. CHECK USER PROFILES
-- =====================================================

-- Show user profiles
SELECT 
    up.id,
    up.username,
    up.full_name,
    up.role,
    au.email,
    au.email_confirmed_at
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- =====================================================
-- 3. CHECK FOR MISMATCHES
-- =====================================================

-- Find users without profiles
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    'NO PROFILE' as issue
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- Find profiles without confirmed emails (if email confirmation is enabled)
SELECT 
    up.id,
    up.username,
    au.email,
    au.email_confirmed_at,
    'PROFILE EXISTS BUT EMAIL NOT CONFIRMED' as issue
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.email_confirmed_at IS NULL;

-- =====================================================
-- 4. SUMMARY
-- =====================================================

DO $$
DECLARE
    total_users INTEGER;
    confirmed_users INTEGER;
    users_with_profiles INTEGER;
    users_without_profiles INTEGER;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- Count confirmed users
    SELECT COUNT(*) INTO confirmed_users FROM auth.users WHERE email_confirmed_at IS NOT NULL;
    
    -- Count users with profiles
    SELECT COUNT(*) INTO users_with_profiles 
    FROM auth.users au
    INNER JOIN public.user_profiles up ON au.id = up.id;
    
    -- Count users without profiles
    SELECT COUNT(*) INTO users_without_profiles 
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'EMAIL CONFIRMATION STATUS SUMMARY';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Confirmed users: %', confirmed_users;
    RAISE NOTICE 'Users with profiles: %', users_with_profiles;
    RAISE NOTICE 'Users without profiles: %', users_without_profiles;
    RAISE NOTICE '=====================================================';
    
    IF users_without_profiles > 0 THEN
        RAISE NOTICE 'WARNING: % users without profiles found', users_without_profiles;
        RAISE NOTICE 'Run the profile creation fix if needed';
    END IF;
    
    IF confirmed_users = 0 AND total_users > 0 THEN
        RAISE NOTICE 'SUGGESTION: Consider disabling email confirmation in Supabase Dashboard';
        RAISE NOTICE 'Go to: Authentication > Settings > Email';
        RAISE NOTICE 'Turn OFF "Enable email confirmations"';
    END IF;
    
    RAISE NOTICE '=====================================================';
END $$;
