-- =====================================================
-- UPLOAD PROMPT PAGE - MINIMAL REQUIRED SQL QUERIES
-- =====================================================
-- Copy and paste these queries in Supabase SQL Editor
-- These are ONLY the queries needed for Upload Prompt functionality

-- =====================================================
-- 1. CREATE STORAGE BUCKET FOR IMAGES
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
    ('prompt-images', 'prompt-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CREATE STORAGE POLICIES FOR IMAGE UPLOADS
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
-- 3. ENSURE PROMPTS TABLE HAS REQUIRED COLUMNS
-- =====================================================

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN image_url TEXT;
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
    END IF;
END $$;

-- =====================================================
-- 4. ENSURE RLS POLICIES FOR PROMPTS TABLE
-- =====================================================

-- Enable RLS on prompts table
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view prompts
DROP POLICY IF EXISTS "Prompts are viewable by everyone" ON public.prompts;
CREATE POLICY "Prompts are viewable by everyone" ON public.prompts
    FOR SELECT USING (true);

-- Allow authenticated users to create prompts
DROP POLICY IF EXISTS "Users can create prompts" ON public.prompts;
CREATE POLICY "Users can create prompts" ON public.prompts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own prompts
DROP POLICY IF EXISTS "Users can update own prompts" ON public.prompts;
CREATE POLICY "Users can update own prompts" ON public.prompts
    FOR UPDATE USING (auth.uid() = created_by);

-- Allow admins to manage all prompts
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
-- 5. ENSURE CATEGORIES TABLE HAS RLS POLICIES
-- =====================================================

-- Enable RLS on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT USING (true);

-- Allow admins to manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- =====================================================
-- 6. ENSURE USER_PROFILES TABLE HAS RLS POLICIES
-- =====================================================

-- Enable RLS on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view user profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 7. GRANT STORAGE PERMISSIONS
-- =====================================================

-- Grant storage permissions to authenticated users
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- =====================================================
-- 8. INSERT SAMPLE CATEGORIES (if none exist)
-- =====================================================

-- Insert sample categories only if the table is empty
INSERT INTO public.categories (name, description, slug) 
SELECT * FROM (VALUES 
    ('AI Art', 'Artificial Intelligence generated artwork and images', 'ai-art'),
    ('Photography', 'Photography prompts and techniques', 'photography'),
    ('Design', 'Graphic design and visual composition', 'design'),
    ('Writing', 'Creative writing and storytelling', 'writing'),
    ('Marketing', 'Marketing and advertising content', 'marketing'),
    ('Education', 'Educational and learning materials', 'education'),
    ('Technology', 'Tech-related prompts and tutorials', 'technology'),
    ('Business', 'Business and professional content', 'business')
) AS new_categories(name, description, slug)
WHERE NOT EXISTS (SELECT 1 FROM public.categories LIMIT 1);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'UPLOAD PROMPT SETUP COMPLETE!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Storage bucket created: prompt-images';
    RAISE NOTICE 'Storage policies configured';
    RAISE NOTICE 'RLS policies enabled on prompts, categories, user_profiles';
    RAISE NOTICE 'Sample categories inserted (if table was empty)';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Your Upload Prompt page is now ready to use!';
    RAISE NOTICE '=====================================================';
END $$;
