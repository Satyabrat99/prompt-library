-- =====================================================
-- SETUP FAVORITES AND VIEW COUNTS - COMPLETE SQL
-- =====================================================
-- Run this entire script in Supabase SQL Editor

-- =====================================================
-- 1. CREATE USER_INTERACTIONS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'copy', 'favorite')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one interaction per user per prompt per type
    UNIQUE(user_id, prompt_id, interaction_type)
);

-- =====================================================
-- 2. ENSURE PROMPTS TABLE HAS REQUIRED COLUMNS
-- =====================================================

-- Add view_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'view_count'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN view_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added view_count column to prompts table';
    ELSE
        RAISE NOTICE 'view_count column already exists in prompts table';
    END IF;
END $$;

-- Add copy_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'copy_count'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN copy_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added copy_count column to prompts table';
    ELSE
        RAISE NOTICE 'copy_count column already exists in prompts table';
    END IF;
END $$;

-- =====================================================
-- 3. CREATE INTERACTION TYPE ENUM
-- =====================================================

DO $$ BEGIN
    CREATE TYPE interaction_type AS ENUM ('view', 'copy', 'favorite');
    RAISE NOTICE 'Created interaction_type enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'interaction_type enum already exists';
END $$;

-- Update the column to use the enum if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN
        ALTER TABLE public.user_interactions 
        ALTER COLUMN interaction_type TYPE interaction_type 
        USING interaction_type::interaction_type;
        RAISE NOTICE 'Updated interaction_type column to use enum';
    END IF;
END $$;

-- =====================================================
-- 4. CREATE INCREMENT FUNCTIONS
-- =====================================================

-- Create increment view count function
CREATE OR REPLACE FUNCTION public.increment_view_count(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.prompts
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create increment copy count function
CREATE OR REPLACE FUNCTION public.increment_copy_count(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.prompts
    SET copy_count = COALESCE(copy_count, 0) + 1
    WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE UPDATED_AT TRIGGER FOR USER_INTERACTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_interactions_updated_at ON public.user_interactions;
CREATE TRIGGER trigger_user_interactions_updated_at
    BEFORE UPDATE ON public.user_interactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES FOR USER_INTERACTIONS
-- =====================================================

-- Users can view their own interactions
DROP POLICY IF EXISTS "Users can view own interactions" ON public.user_interactions;
CREATE POLICY "Users can view own interactions" ON public.user_interactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own interactions
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.user_interactions;
CREATE POLICY "Users can insert own interactions" ON public.user_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own interactions
DROP POLICY IF EXISTS "Users can update own interactions" ON public.user_interactions;
CREATE POLICY "Users can update own interactions" ON public.user_interactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own interactions
DROP POLICY IF EXISTS "Users can delete own interactions" ON public.user_interactions;
CREATE POLICY "Users can delete own interactions" ON public.user_interactions
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage all interactions
DROP POLICY IF EXISTS "Admins can manage all interactions" ON public.user_interactions;
CREATE POLICY "Admins can manage all interactions" ON public.user_interactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on user_interactions table
GRANT ALL ON public.user_interactions TO anon, authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_copy_count(UUID) TO anon, authenticated;

-- =====================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);

-- Index on prompt_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_interactions_prompt_id ON public.user_interactions(prompt_id);

-- Index on interaction_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON public.user_interactions(interaction_type);

-- Composite index for unique constraint performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_unique ON public.user_interactions(user_id, prompt_id, interaction_type);

-- =====================================================
-- 10. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get user's favorite prompts
CREATE OR REPLACE FUNCTION public.get_user_favorites(user_uuid UUID)
RETURNS TABLE (
    prompt_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT ui.prompt_id, ui.created_at
    FROM public.user_interactions ui
    WHERE ui.user_id = user_uuid
    AND ui.interaction_type = 'favorite'
    ORDER BY ui.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has favorited a prompt
CREATE OR REPLACE FUNCTION public.is_favorited(user_uuid UUID, prompt_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_interactions
        WHERE user_id = user_uuid
        AND prompt_id = prompt_uuid
        AND interaction_type = 'favorite'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_favorites(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_favorited(UUID, UUID) TO anon, authenticated;

-- =====================================================
-- 11. TEST DATA (OPTIONAL - REMOVE IF NOT NEEDED)
-- =====================================================

-- Uncomment these lines to add test data
/*
-- Insert test interaction (replace with actual user and prompt IDs)
INSERT INTO public.user_interactions (user_id, prompt_id, interaction_type)
VALUES (
    'your-user-id-here',
    'your-prompt-id-here',
    'favorite'
) ON CONFLICT (user_id, prompt_id, interaction_type) DO NOTHING;
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FAVORITES AND VIEW COUNTS SETUP COMPLETE!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ user_interactions table created/verified';
    RAISE NOTICE '✅ view_count and copy_count columns added to prompts';
    RAISE NOTICE '✅ interaction_type enum created';
    RAISE NOTICE '✅ increment_view_count() function created';
    RAISE NOTICE '✅ increment_copy_count() function created';
    RAISE NOTICE '✅ RLS policies enabled and configured';
    RAISE NOTICE '✅ Performance indexes created';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '✅ All permissions granted';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Your favorites and view count functionality is ready!';
    RAISE NOTICE '=====================================================';
END $$;
