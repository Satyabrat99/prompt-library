-- =====================================================
-- COMPLETE CREDIT SYSTEM FIX
-- =====================================================
-- This script ensures the credit system is properly set up and working

-- =====================================================
-- 1. CREATE USER_CREDITS TABLE
-- =====================================================

-- Drop and recreate user_credits table to ensure clean state
DROP TABLE IF EXISTS public.user_credits CASCADE;

CREATE TABLE public.user_credits (
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

-- Drop and recreate user_unlocked_prompts table
DROP TABLE IF EXISTS public.user_unlocked_prompts CASCADE;

CREATE TABLE public.user_unlocked_prompts (
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
    
    -- Insert credits for today if they don't exist
    INSERT INTO public.user_credits (user_id, credits_remaining, daily_quota, credit_date)
    VALUES (target_user_id, default_credits, default_quota, today_date)
    ON CONFLICT (user_id, credit_date) DO NOTHING;
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
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Enable RLS on user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only update their own credits (for the RPC function)
CREATE POLICY "Users can update own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: System can insert credits (for initialization)
CREATE POLICY "System can insert credits" ON public.user_credits
    FOR INSERT WITH CHECK (true);

-- Enable RLS on user_unlocked_prompts
ALTER TABLE public.user_unlocked_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own unlocked prompts
CREATE POLICY "Users can view own unlocked prompts" ON public.user_unlocked_prompts
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own unlocked prompts
CREATE POLICY "Users can insert own unlocked prompts" ON public.user_unlocked_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_credits TO authenticated;
GRANT SELECT, INSERT ON public.user_unlocked_prompts TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.initialize_user_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_prompt_credit(UUID) TO authenticated;

-- =====================================================
-- 7. CREATE CREDITS FOR EXISTING USERS
-- =====================================================

-- Initialize credits for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id FROM auth.users
    LOOP
        PERFORM public.initialize_user_credits(user_record.id);
    END LOOP;
END $$;

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Check if tables exist
SELECT 'user_credits table exists' as status WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_credits' AND table_schema = 'public'
);

SELECT 'user_unlocked_prompts table exists' as status WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_unlocked_prompts' AND table_schema = 'public'
);

-- Check if functions exist
SELECT 'initialize_user_credits function exists' as status WHERE EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'initialize_user_credits' AND routine_schema = 'public'
);

SELECT 'spend_prompt_credit function exists' as status WHERE EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'spend_prompt_credit' AND routine_schema = 'public'
);

-- Check user credits count
SELECT COUNT(*) as total_user_credits_records FROM public.user_credits;

-- Check today's credits
SELECT COUNT(*) as todays_credits_records FROM public.user_credits WHERE credit_date = CURRENT_DATE;
