-- =====================================================
-- FEATURED COLLECTIONS SYSTEM SETUP
-- =====================================================
-- This script creates the database schema for featured collections

-- =====================================================
-- 1. CREATE FEATURED_COLLECTIONS TABLE
-- =====================================================

-- Create featured_collections table
CREATE TABLE IF NOT EXISTS public.featured_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    redirect_category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    badge_text VARCHAR(50) DEFAULT 'Featured',
    badge_color VARCHAR(50) DEFAULT 'purple',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_featured_collections_active ON public.featured_collections(is_active);
CREATE INDEX IF NOT EXISTS idx_featured_collections_order ON public.featured_collections(display_order);
CREATE INDEX IF NOT EXISTS idx_featured_collections_category ON public.featured_collections(redirect_category_id);

-- =====================================================
-- 3. SET UP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on featured_collections
ALTER TABLE public.featured_collections ENABLE ROW LEVEL SECURITY;

-- RLS policy - everyone can read active featured collections
CREATE POLICY "Anyone can view active featured collections" ON public.featured_collections
    FOR SELECT USING (is_active = true);

-- RLS policy - only admins can manage featured collections
CREATE POLICY "Admins can manage featured collections" ON public.featured_collections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.featured_collections TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 5. INSERT SAMPLE DATA
-- =====================================================

-- Insert sample featured collections (you can modify these)
INSERT INTO public.featured_collections (title, description, image_url, redirect_category_id, display_order, badge_text, badge_color) VALUES
(
    'AI Art Collection',
    'Discover stunning AI-generated artwork and creative prompts',
    '/dryfruit.png',
    (SELECT id FROM public.categories LIMIT 1 OFFSET 0), -- First category
    1,
    'New',
    'purple'
),
(
    'Creative Writing',
    'Master the art of storytelling with AI-powered writing prompts',
    '/asmr.png',
    (SELECT id FROM public.categories LIMIT 1 OFFSET 1), -- Second category
    2,
    'Popular',
    'blue'
),
(
    'Product Photography',
    'Professional product photography prompts for stunning visuals',
    '/interior.png',
    (SELECT id FROM public.categories LIMIT 1 OFFSET 2), -- Third category
    3,
    'Trending',
    'green'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CREATE FUNCTION TO UPDATE TIMESTAMPS
-- =====================================================

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_featured_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_featured_collections_updated_at
    BEFORE UPDATE ON public.featured_collections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_featured_collections_updated_at();

-- =====================================================
-- 7. CHECK STATUS
-- =====================================================

-- Check featured collections status
DO $$
DECLARE
    total_collections INTEGER;
    active_collections INTEGER;
BEGIN
    -- Count total collections
    SELECT COUNT(*) INTO total_collections FROM public.featured_collections;
    
    -- Count active collections
    SELECT COUNT(*) INTO active_collections FROM public.featured_collections WHERE is_active = true;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEATURED COLLECTIONS SYSTEM STATUS';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total featured collections: %', total_collections;
    RAISE NOTICE 'Active featured collections: %', active_collections;
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Featured collections system is ready!';
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEATURED COLLECTIONS SYSTEM SETUP COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '1. featured_collections table';
    RAISE NOTICE '2. Indexes for performance';
    RAISE NOTICE '3. RLS policies for security';
    RAISE NOTICE '4. Sample featured collections';
    RAISE NOTICE '5. Auto-update timestamp trigger';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Admin can now manage featured collections!';
    RAISE NOTICE 'Users will see featured collections on explore page!';
    RAISE NOTICE '=====================================================';
END $$;
