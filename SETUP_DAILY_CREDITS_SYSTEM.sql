-- =====================================================
-- COMPLETE DAILY CREDITS SYSTEM SETUP
-- =====================================================
-- This script sets up the complete daily credits system for prompt unlocking

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
-- 2. CREATE USER_UNLOCKED_PROMPTS TABLE
-- =====================================================

-- Create user_unlocked_prompts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_unlocked_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, prompt_id)
);

-- =====================================================
-- 3. CREATE FUNCTIONS
-- =====================================================

-- Create initialize_user_credits function
CREATE OR REPLACE FUNCTION public.initialize_user_credits(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    today_date DATE;
    default_credits INTEGER := 5;
    default_quota INTEGER := 5;
BEGIN
    -- Get current date
    today_date := CURRENT_DATE;
    
    -- Insert credits for current date if not exists
    INSERT INTO public.user_credits (user_id, credits_remaining, daily_quota, credit_date)
    VALUES (target_user_id, default_credits, default_quota, today_date)
    ON CONFLICT (user_id, credit_date) DO NOTHING;
    
    RAISE NOTICE 'Initialized daily credits for user %: % credits', target_user_id, default_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create spend_prompt_credit function
CREATE OR REPLACE FUNCTION public.spend_prompt_credit(in_prompt_id UUID)
RETURNS TABLE(success BOOLEAN, credits_left INTEGER) AS $$
DECLARE
    current_user_id UUID;
    today_date DATE;
    user_credit RECORD;
    remaining_credits INTEGER;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT false, 0;
        RETURN;
    END IF;
    
    -- Get current date
    today_date := CURRENT_DATE;
    
    -- Get user's current credits
    SELECT * INTO user_credit
    FROM public.user_credits
    WHERE user_id = current_user_id
    AND credit_date = today_date;
    
    -- If no credits record exists, create one
    IF user_credit IS NULL THEN
        PERFORM public.initialize_user_credits(current_user_id);
        SELECT * INTO user_credit
        FROM public.user_credits
        WHERE user_id = current_user_id
        AND credit_date = today_date;
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
    AND credit_date = today_date
    RETURNING credits_remaining INTO remaining_credits;
    
    -- Mark prompt as unlocked for this user
    INSERT INTO public.user_unlocked_prompts (user_id, prompt_id)
    VALUES (current_user_id, in_prompt_id)
    ON CONFLICT (user_id, prompt_id) DO NOTHING;
    
    -- Return success with remaining credits
    RETURN QUERY SELECT true, remaining_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

-- Create indexes for user_credits
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_date ON public.user_credits(credit_date);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_date ON public.user_credits(user_id, credit_date);

-- Create indexes for user_unlocked_prompts
CREATE INDEX IF NOT EXISTS idx_user_unlocked_prompts_user_id ON public.user_unlocked_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_prompts_prompt_id ON public.user_unlocked_prompts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_prompts_user_prompt ON public.user_unlocked_prompts(user_id, prompt_id);

-- =====================================================
-- 5. SET UP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- RLS policy for user_credits - users can only see their own credits
CREATE POLICY "Users can view their own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits" ON public.user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable RLS on user_unlocked_prompts
ALTER TABLE public.user_unlocked_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policy for user_unlocked_prompts - users can only see their own unlocked prompts
CREATE POLICY "Users can view their own unlocked prompts" ON public.user_unlocked_prompts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked prompts" ON public.user_unlocked_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unlocked prompts" ON public.user_unlocked_prompts
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 6. CREATE CREDITS FOR EXISTING USERS
-- =====================================================

-- Create credits for existing users who don't have them for today
DO $$
DECLARE
    today_date DATE;
    user_record RECORD;
    credits_count INTEGER;
BEGIN
    -- Get current date
    today_date := CURRENT_DATE;
    
    -- Count how many users need credits
    SELECT COUNT(*) INTO credits_count
    FROM auth.users au
    LEFT JOIN public.user_credits uc ON au.id = uc.user_id 
        AND uc.credit_date = today_date
    WHERE uc.user_id IS NULL;
    
    RAISE NOTICE 'Creating daily credits for % existing users', credits_count;
    
    -- Create credits for users who don't have them
    FOR user_record IN 
        SELECT au.id
        FROM auth.users au
        LEFT JOIN public.user_credits uc ON au.id = uc.user_id 
            AND uc.credit_date = today_date
        WHERE uc.user_id IS NULL
    LOOP
        PERFORM public.initialize_user_credits(user_record.id);
    END LOOP;
    
    RAISE NOTICE 'Daily credits created for existing users';
END $$;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for the functions to work
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_credits TO anon, authenticated;
GRANT ALL ON public.user_unlocked_prompts TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 8. CHECK STATUS
-- =====================================================

-- Check credits status
DO $$
DECLARE
    total_users INTEGER;
    users_with_credits INTEGER;
    today_date DATE;
BEGIN
    -- Get current date
    today_date := CURRENT_DATE;
    
    -- Count users
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- Count users with credits
    SELECT COUNT(*) INTO users_with_credits
    FROM auth.users au
    INNER JOIN public.user_credits uc ON au.id = uc.user_id
    WHERE uc.credit_date = today_date;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DAILY CREDITS SYSTEM STATUS';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users with credits today: %', users_with_credits;
    RAISE NOTICE 'Current date: %', today_date;
    RAISE NOTICE 'Default credits per user per day: 5';
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DAILY CREDITS SYSTEM SETUP COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '1. user_credits table';
    RAISE NOTICE '2. user_unlocked_prompts table';
    RAISE NOTICE '3. initialize_user_credits function';
    RAISE NOTICE '4. spend_prompt_credit function';
    RAISE NOTICE '5. Indexes and RLS policies';
    RAISE NOTICE '6. Credits for existing users';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Users now get 5 daily credits that reset every day!';
    RAISE NOTICE 'Prompt unlocking with credits is now working!';
    RAISE NOTICE '=====================================================';
END $$;
