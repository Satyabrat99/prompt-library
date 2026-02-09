-- =====================================================
-- FIX NEW USER DEFAULT DAILY CREDITS (5 PER DAY)
-- =====================================================
-- This script creates the user_credits table and assigns 5 daily credits to new users

-- =====================================================
-- 1. CREATE USER_CREDITS TABLE
-- =====================================================

-- Create user_credits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credits_remaining INTEGER DEFAULT 5 NOT NULL,
    daily_quota INTEGER DEFAULT 5 NOT NULL,
    credit_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, credit_date)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_date ON public.user_credits(credit_date);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_date ON public.user_credits(user_id, credit_date);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on user_credits table
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "System can insert credits" ON public.user_credits;
DROP POLICY IF EXISTS "System can update credits" ON public.user_credits;

-- Create RLS policies
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert credits" ON public.user_credits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update credits" ON public.user_credits
    FOR UPDATE USING (true);

-- =====================================================
-- 4. CREATE FUNCTION TO INITIALIZE USER CREDITS
-- =====================================================

-- Create function to initialize credits for new users
CREATE OR REPLACE FUNCTION public.initialize_user_credits(user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_date DATE;
    default_credits INTEGER := 5;
    default_quota INTEGER := 5;
BEGIN
    -- Get current date
    current_date := CURRENT_DATE;
    
    -- Insert credits for current date if not exists
    INSERT INTO public.user_credits (user_id, credits_remaining, daily_quota, credit_date)
    VALUES (user_id, default_credits, default_quota, current_date)
    ON CONFLICT (user_id, credit_date) DO NOTHING;
    
    RAISE NOTICE 'Initialized daily credits for user %: % credits', user_id, default_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 5. UPDATE HANDLE_NEW_USER FUNCTION TO INCLUDE CREDITS
-- =====================================================

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_email_confirmation() CASCADE;

-- Create updated handle_new_user function with credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Don't create profile immediately - wait for email confirmation
    RAISE NOTICE 'New user created: % (email: %)', NEW.id, NEW.email;
    RAISE NOTICE 'Email confirmed: %', NEW.email_confirmed_at;
    
    -- Only create profile if email is already confirmed (shouldn't happen on signup)
    IF NEW.email_confirmed_at IS NOT NULL THEN
        -- Create user profile
        INSERT INTO public.user_profiles (id, username, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'user'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Initialize credits for the user
        PERFORM public.initialize_user_credits(NEW.id);
        
        RAISE NOTICE 'Profile and credits created for confirmed user: %', NEW.id;
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
-- 6. CREATE EMAIL CONFIRMATION HANDLER WITH CREDITS
-- =====================================================

-- Create function to handle email confirmation with credits
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- When email gets confirmed, create the user profile and credits
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        RAISE NOTICE 'Email confirmed for user: %', NEW.id;
        
        -- Create user profile
        INSERT INTO public.user_profiles (id, username, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'user'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Initialize credits for the user
        PERFORM public.initialize_user_credits(NEW.id);
        
        RAISE NOTICE 'Profile and credits created for confirmed user: %', NEW.id;
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
-- 7. CREATE CREDITS FOR EXISTING USERS
-- =====================================================

-- Create credits for existing users who don't have them
DO $$
DECLARE
    current_date DATE;
    user_record RECORD;
    credits_count INTEGER;
BEGIN
    -- Get current date
    current_date := CURRENT_DATE;
    
    -- Count how many users need credits
    SELECT COUNT(*) INTO credits_count
    FROM auth.users au
    LEFT JOIN public.user_credits uc ON au.id = uc.user_id 
        AND uc.credit_date = current_date
    WHERE uc.user_id IS NULL;
    
    RAISE NOTICE 'Creating daily credits for % existing users', credits_count;
    
    -- Create credits for users who don't have them
    FOR user_record IN 
        SELECT au.id
        FROM auth.users au
        LEFT JOIN public.user_credits uc ON au.id = uc.user_id 
            AND uc.credit_date = current_date
        WHERE uc.user_id IS NULL
    LOOP
        PERFORM public.initialize_user_credits(user_record.id);
    END LOOP;
    
    RAISE NOTICE 'Daily credits created for existing users';
END $$;

-- =====================================================
-- 8. CREATE SPEND_CREDIT FUNCTION
-- =====================================================

-- Create function to spend credits (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.spend_prompt_credit(in_prompt_id UUID)
RETURNS TABLE(success BOOLEAN, credits_left INTEGER) AS $$
DECLARE
    current_user_id UUID;
    current_date DATE;
    user_credit RECORD;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT false, 0;
        RETURN;
    END IF;
    
    -- Get current date
    current_date := CURRENT_DATE;
    
    -- Get user's current credits
    SELECT * INTO user_credit
    FROM public.user_credits
    WHERE user_id = current_user_id
    AND credit_date = current_date;
    
    -- If no credits record exists, create one
    IF user_credit IS NULL THEN
        PERFORM public.initialize_user_credits(current_user_id);
        SELECT * INTO user_credit
        FROM public.user_credits
        WHERE user_id = current_user_id
        AND credit_date = current_date;
    END IF;
    
    -- Check if user has credits
    IF user_credit.credits_remaining <= 0 THEN
        RETURN QUERY SELECT false, user_credit.credits_remaining;
        RETURN;
    END IF;
    
    -- Spend one credit
    UPDATE public.user_credits
    SET credits_remaining = credits_remaining - 1,
        updated_at = NOW()
    WHERE user_id = current_user_id
    AND credit_date = current_date;
    
    -- Return success with remaining credits
    RETURN QUERY SELECT true, credits_remaining - 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for the functions to work
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_credits TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 10. CHECK CREDITS STATUS
-- =====================================================

-- Check current credits status
DO $$
DECLARE
    total_users INTEGER;
    users_with_credits INTEGER;
    current_date DATE;
BEGIN
    -- Get current date
    current_date := CURRENT_DATE;
    
    -- Count users
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- Count users with credits
    SELECT COUNT(*) INTO users_with_credits
    FROM auth.users au
    INNER JOIN public.user_credits uc ON au.id = uc.user_id
    WHERE uc.credit_date = current_date;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DAILY CREDITS SYSTEM STATUS';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users with credits today: %', users_with_credits;
    RAISE NOTICE 'Current date: %', current_date;
    RAISE NOTICE 'Default credits per user per day: 5';
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'NEW USER DEFAULT DAILY CREDITS FIXED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Created user_credits table with daily tracking';
    RAISE NOTICE '2. Added RLS policies for credits';
    RAISE NOTICE '3. Created initialize_user_credits() function';
    RAISE NOTICE '4. Updated handle_new_user() to include credits';
    RAISE NOTICE '5. Updated email confirmation handler';
    RAISE NOTICE '6. Created credits for existing users';
    RAISE NOTICE '7. Created spend_prompt_credit() function';
    RAISE NOTICE '8. Fixed permissions';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'New users will now get 5 daily credits!';
    RAISE NOTICE 'Credits reset every day at midnight.';
    RAISE NOTICE '=====================================================';
END $$;
