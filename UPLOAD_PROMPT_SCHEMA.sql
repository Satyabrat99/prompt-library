-- =====================================================
-- UPLOAD PROMPT PAGE - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This script sets up all tables, policies, and functions
-- needed for the Upload Prompt functionality

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- Media type enum
DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('image', 'video', 'audio', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Difficulty level enum
DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompts table (main table for upload prompt page)
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    prompt_text TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    media_type media_type DEFAULT 'image',
    difficulty_level difficulty_level DEFAULT 'beginner',
    style_tags TEXT[] DEFAULT '{}',
    industry_tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    video_url TEXT,
    audio_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interactions table (for analytics)
CREATE TABLE IF NOT EXISTS public.user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'view', 'like', 'download', 'share'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Prompts indexes
CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON public.prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_by ON public.prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_media_type ON public.prompts(media_type);
CREATE INDEX IF NOT EXISTS idx_prompts_difficulty_level ON public.prompts(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_prompts_style_tags ON public.prompts USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_prompts_industry_tags ON public.prompts USING GIN(industry_tags);

-- User interactions indexes
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_prompt_id ON public.user_interactions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON public.user_interactions(interaction_type);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- =====================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_prompts_updated_at ON public.prompts;
CREATE TRIGGER trigger_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. CREATE FUNCTIONS
-- =====================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote user to admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO _user_id FROM auth.users WHERE email = user_email;
    
    IF _user_id IS NOT NULL THEN
        -- Update the user_profiles table to set the role to 'admin'
        UPDATE public.user_profiles
        SET role = 'admin'
        WHERE id = _user_id;
        RAISE NOTICE 'User % promoted to admin.', user_email;
    ELSE
        RAISE EXCEPTION 'User with email % not found.', user_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get prompt statistics
CREATE OR REPLACE FUNCTION public.get_prompt_stats(prompt_uuid UUID)
RETURNS TABLE(
    total_views BIGINT,
    total_likes BIGINT,
    total_downloads BIGINT,
    total_shares BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN ui.interaction_type = 'view' THEN 1 END) as total_views,
        COUNT(CASE WHEN ui.interaction_type = 'like' THEN 1 END) as total_likes,
        COUNT(CASE WHEN ui.interaction_type = 'download' THEN 1 END) as total_downloads,
        COUNT(CASE WHEN ui.interaction_type = 'share' THEN 1 END) as total_shares
    FROM public.user_interactions ui
    WHERE ui.prompt_id = prompt_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

-- Trigger for new user registration
DROP TRIGGER IF EXISTS trigger_new_user ON auth.users;
CREATE TRIGGER trigger_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Categories policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories are manageable by admins" ON public.categories;
CREATE POLICY "Categories are manageable by admins" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- User profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Prompts policies
DROP POLICY IF EXISTS "Prompts are viewable by everyone" ON public.prompts;
CREATE POLICY "Prompts are viewable by everyone" ON public.prompts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create prompts" ON public.prompts;
CREATE POLICY "Users can create prompts" ON public.prompts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own prompts" ON public.prompts;
CREATE POLICY "Users can update own prompts" ON public.prompts
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete own prompts" ON public.prompts;
CREATE POLICY "Users can delete own prompts" ON public.prompts
    FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can manage all prompts" ON public.prompts;
CREATE POLICY "Admins can manage all prompts" ON public.prompts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- User interactions policies
DROP POLICY IF EXISTS "Users can view all interactions" ON public.user_interactions;
CREATE POLICY "Users can view all interactions" ON public.user_interactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create interactions" ON public.user_interactions;
CREATE POLICY "Users can create interactions" ON public.user_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own interactions" ON public.user_interactions;
CREATE POLICY "Users can update own interactions" ON public.user_interactions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interactions" ON public.user_interactions;
CREATE POLICY "Users can delete own interactions" ON public.user_interactions
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 8. CREATE STORAGE BUCKETS AND POLICIES
-- =====================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('prompt-images', 'prompt-images', true),
    ('prompt-videos', 'prompt-videos', true),
    ('prompt-audio', 'prompt-audio', true),
    ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for prompt-images bucket
DROP POLICY IF EXISTS "Prompt images are publicly accessible" ON storage.objects;
CREATE POLICY "Prompt images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'prompt-images');

DROP POLICY IF EXISTS "Authenticated users can upload prompt images" ON storage.objects;
CREATE POLICY "Authenticated users can upload prompt images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'prompt-images' 
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Users can update own prompt images" ON storage.objects;
CREATE POLICY "Users can update own prompt images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'prompt-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own prompt images" ON storage.objects;
CREATE POLICY "Users can delete own prompt images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'prompt-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for user-avatars bucket
DROP POLICY IF EXISTS "User avatars are publicly accessible" ON storage.objects;
CREATE POLICY "User avatars are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- 9. INSERT SAMPLE DATA
-- =====================================================

-- Insert sample categories
INSERT INTO public.categories (name, description, color) VALUES 
    ('AI Art', 'Artificial Intelligence generated artwork and images', '#FF6B6B'),
    ('Photography', 'Photography prompts and techniques', '#4ECDC4'),
    ('Design', 'Graphic design and visual composition', '#45B7D1'),
    ('Writing', 'Creative writing and storytelling', '#96CEB4'),
    ('Marketing', 'Marketing and advertising content', '#FFEAA7'),
    ('Education', 'Educational and learning materials', '#DDA0DD'),
    ('Technology', 'Tech-related prompts and tutorials', '#98D8C8'),
    ('Business', 'Business and professional content', '#F7DC6F')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 10. CREATE VIEWS FOR ANALYTICS
-- =====================================================

-- View for prompt analytics
CREATE OR REPLACE VIEW public.prompt_analytics AS
SELECT 
    p.id,
    p.title,
    p.created_at,
    p.media_type,
    p.difficulty_level,
    c.name as category_name,
    up.username as creator_username,
    COUNT(ui.id) as total_interactions,
    COUNT(CASE WHEN ui.interaction_type = 'view' THEN 1 END) as views,
    COUNT(CASE WHEN ui.interaction_type = 'like' THEN 1 END) as likes,
    COUNT(CASE WHEN ui.interaction_type = 'download' THEN 1 END) as downloads,
    COUNT(CASE WHEN ui.interaction_type = 'share' THEN 1 END) as shares
FROM public.prompts p
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.user_profiles up ON p.created_by = up.id
LEFT JOIN public.user_interactions ui ON p.id = ui.prompt_id
GROUP BY p.id, p.title, p.created_at, p.media_type, p.difficulty_level, c.name, up.username;

-- View for user statistics
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    up.id,
    up.username,
    up.role,
    COUNT(DISTINCT p.id) as total_prompts,
    COUNT(DISTINCT ui.id) as total_interactions,
    COUNT(DISTINCT CASE WHEN ui.interaction_type = 'view' THEN ui.prompt_id END) as prompts_viewed,
    COUNT(DISTINCT CASE WHEN ui.interaction_type = 'like' THEN ui.prompt_id END) as prompts_liked
FROM public.user_profiles up
LEFT JOIN public.prompts p ON up.id = p.created_by
LEFT JOIN public.user_interactions ui ON up.id = ui.user_id
GROUP BY up.id, up.username, up.role;

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant storage permissions
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'UPLOAD PROMPT SCHEMA SETUP COMPLETE!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created: categories, user_profiles, prompts, user_interactions';
    RAISE NOTICE 'Storage buckets created: prompt-images, user-avatars';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Functions created: handle_new_user, promote_user_to_admin, get_prompt_stats';
    RAISE NOTICE 'Views created: prompt_analytics, user_stats';
    RAISE NOTICE 'Sample categories inserted';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: SELECT public.promote_user_to_admin(''your-email@example.com'');';
    RAISE NOTICE '2. Test the Upload Prompt page';
    RAISE NOTICE '3. Upload images and create prompts';
    RAISE NOTICE '=====================================================';
END $$;
