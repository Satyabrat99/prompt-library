-- =====================================================
-- SIMPLE DATABASE SCHEMA FIX - NO CONFLICT ISSUES
-- =====================================================
-- Run these queries in Supabase SQL Editor to fix schema issues

-- =====================================================
-- 1. ADD MISSING COLUMNS TO PROMPTS TABLE
-- =====================================================

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to prompts table';
    ELSE
        RAISE NOTICE 'image_url column already exists in prompts table';
    END IF;
END $$;

-- Add style_tags column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'style_tags'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN style_tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added style_tags column to prompts table';
    ELSE
        RAISE NOTICE 'style_tags column already exists in prompts table';
    END IF;
END $$;

-- Add industry_tags column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'industry_tags'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN industry_tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added industry_tags column to prompts table';
    ELSE
        RAISE NOTICE 'industry_tags column already exists in prompts table';
    END IF;
END $$;

-- =====================================================
-- 2. ENSURE CATEGORIES TABLE HAS REQUIRED COLUMNS
-- =====================================================

-- Add slug column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.categories ADD COLUMN slug VARCHAR(100);
        RAISE NOTICE 'Added slug column to categories table';
    ELSE
        RAISE NOTICE 'slug column already exists in categories table';
    END IF;
END $$;

-- Add color column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'color'
    ) THEN
        ALTER TABLE public.categories ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
        RAISE NOTICE 'Added color column to categories table';
    ELSE
        RAISE NOTICE 'color column already exists in categories table';
    END IF;
END $$;

-- =====================================================
-- 3. CREATE ENUMS IF THEY DON'T EXIST
-- =====================================================

-- Media type enum
DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('image', 'video', 'audio', 'text');
    RAISE NOTICE 'Created media_type enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'media_type enum already exists';
END $$;

-- Difficulty level enum
DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
    RAISE NOTICE 'Created difficulty_level enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'difficulty_level enum already exists';
END $$;

-- User role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
    RAISE NOTICE 'Created user_role enum';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'user_role enum already exists';
END $$;

-- =====================================================
-- 4. ENSURE USER_PROFILES TABLE EXISTS WITH ROLE COLUMN
-- =====================================================

-- Create user_profiles table if it doesn't exist
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

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN role user_role DEFAULT 'user';
        RAISE NOTICE 'Added role column to user_profiles table';
    ELSE
        RAISE NOTICE 'role column already exists in user_profiles table';
    END IF;
END $$;

-- =====================================================
-- 5. CREATE STORAGE BUCKET FOR IMAGES
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
    ('prompt-images', 'prompt-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. CREATE STORAGE POLICIES
-- =====================================================

-- Allow public access to view images
DROP POLICY IF EXISTS "Prompt images are publicly accessible" ON storage.objects;
CREATE POLICY "Prompt images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'prompt-images');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload prompt images" ON storage.objects;
CREATE POLICY "Authenticated users can upload prompt images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'prompt-images' 
        AND auth.role() = 'authenticated'
    );

-- Allow users to update their own images
DROP POLICY IF EXISTS "Users can update own prompt images" ON storage.objects;
CREATE POLICY "Users can update own prompt images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'prompt-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own images
DROP POLICY IF EXISTS "Users can delete own prompt images" ON storage.objects;
CREATE POLICY "Users can delete own prompt images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'prompt-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE RLS POLICIES
-- =====================================================

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

-- =====================================================
-- 9. INSERT SAMPLE CATEGORIES (WITHOUT CONFLICT)
-- =====================================================

-- Insert sample categories only if they don't exist
INSERT INTO public.categories (name, description, slug, color) 
SELECT 'AI Art', 'Artificial Intelligence generated artwork and images', 'ai-art', '#FF6B6B'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'AI Art');

INSERT INTO public.categories (name, description, slug, color) 
SELECT 'Photography', 'Photography prompts and techniques', 'photography', '#4ECDC4'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Photography');

INSERT INTO public.categories (name, description, slug, color) 
SELECT 'Design', 'Graphic design and visual composition', 'design', '#45B7D1'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Design');

INSERT INTO public.categories (name, description, slug, color) 
SELECT 'Writing', 'Creative writing and storytelling', 'writing', '#96CEB4'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Writing');

INSERT INTO public.categories (name, description, slug, color) 
SELECT 'Marketing', 'Marketing and advertising content', 'marketing', '#FFEAA7'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Marketing');

INSERT INTO public.categories (name, description, slug, color) 
SELECT 'Education', 'Educational and learning materials', 'education', '#DDA0DD'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Education');

INSERT INTO public.categories (name, description, slug, color) 
SELECT 'Technology', 'Tech-related prompts and tutorials', 'technology', '#98D8C8'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Technology');

INSERT INTO public.categories (name, description, slug, color) 
SELECT 'Business', 'Business and professional content', 'business', '#F7DC6F'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Business');

-- =====================================================
-- 10. CREATE USER REGISTRATION HANDLER
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
-- 11. CREATE ADMIN PROMOTION FUNCTION
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
-- 12. GRANT PERMISSIONS
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
    RAISE NOTICE 'SIMPLE DATABASE SCHEMA FIX COMPLETE!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'All required columns added to prompts table';
    RAISE NOTICE 'All required columns added to categories table';
    RAISE NOTICE 'Enums created for media_type, difficulty_level, user_role';
    RAISE NOTICE 'Storage bucket and policies configured';
    RAISE NOTICE 'RLS policies enabled on all tables';
    RAISE NOTICE 'Sample categories inserted (without conflicts)';
    RAISE NOTICE 'User registration handler created';
    RAISE NOTICE 'Admin promotion function created';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: SELECT public.promote_user_to_admin(''your-email@example.com'');';
    RAISE NOTICE '2. Test the Upload Prompt page';
    RAISE NOTICE '3. Upload images and create prompts';
    RAISE NOTICE '=====================================================';
END $$;
