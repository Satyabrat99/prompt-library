-- =====================================================
-- QUICK UPLOAD PROMPT SETUP - MINIMAL REQUIRED SCHEMA
-- =====================================================
-- This is a simplified version with only essential tables and policies

-- =====================================================
-- 1. CREATE ENUMS (if not exists)
-- =====================================================

DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('image', 'video', 'audio', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE ESSENTIAL TABLES
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

-- Prompts table (main table for uploads)
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

-- =====================================================
-- 3. CREATE BASIC INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON public.prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_by ON public.prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompts_updated_at ON public.prompts;
CREATE TRIGGER trigger_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. CREATE USER REGISTRATION HANDLER
-- =====================================================

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

DROP TRIGGER IF EXISTS trigger_new_user ON auth.users;
CREATE TRIGGER trigger_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. CREATE ADMIN PROMOTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    _user_id UUID;
BEGIN
    SELECT id INTO _user_id FROM auth.users WHERE email = user_email;
    
    IF _user_id IS NOT NULL THEN
        UPDATE public.user_profiles
        SET role = 'admin'
        WHERE id = _user_id;
        RAISE NOTICE 'User % promoted to admin.', user_email;
    ELSE
        RAISE EXCEPTION 'User with email % not found.', user_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE BASIC RLS POLICIES
-- =====================================================

-- Categories policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
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

DROP POLICY IF EXISTS "Admins can manage all prompts" ON public.prompts;
CREATE POLICY "Admins can manage all prompts" ON public.prompts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- =====================================================
-- 9. CREATE STORAGE BUCKET FOR IMAGES
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
    ('prompt-images', 'prompt-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for prompt-images
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

-- =====================================================
-- 10. INSERT SAMPLE CATEGORIES
-- =====================================================

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
-- 11. GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'QUICK UPLOAD PROMPT SETUP COMPLETE!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Essential tables created: categories, user_profiles, prompts';
    RAISE NOTICE 'Storage bucket created: prompt-images';
    RAISE NOTICE 'RLS policies enabled';
    RAISE NOTICE 'Sample categories inserted';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'To promote yourself to admin, run:';
    RAISE NOTICE 'SELECT public.promote_user_to_admin(''your-email@example.com'');';
    RAISE NOTICE '=====================================================';
END $$;
