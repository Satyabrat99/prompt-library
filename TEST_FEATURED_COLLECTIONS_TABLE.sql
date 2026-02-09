-- =====================================================
-- TEST FEATURED COLLECTIONS TABLE
-- =====================================================
-- This script tests if the featured_collections table is working properly

-- =====================================================
-- 1. CHECK TABLE EXISTS
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'featured_collections' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ featured_collections table exists';
    ELSE
        RAISE NOTICE '❌ featured_collections table does NOT exist';
    END IF;
END $$;

-- =====================================================
-- 2. CHECK TABLE STRUCTURE
-- =====================================================

DO $$
DECLARE
    column_info RECORD;
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEATURED_COLLECTIONS TABLE STRUCTURE';
    RAISE NOTICE '=====================================================';
    
    FOR column_info IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'featured_collections' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %', 
            column_info.column_name, 
            column_info.data_type, 
            column_info.is_nullable, 
            column_info.column_default;
    END LOOP;
    
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- 3. CHECK RLS POLICIES
-- =====================================================

DO $$
DECLARE
    policy_info RECORD;
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'RLS POLICIES';
    RAISE NOTICE '=====================================================';
    
    FOR policy_info IN 
        SELECT policyname, permissive, roles, cmd, qual
        FROM pg_policies 
        WHERE tablename = 'featured_collections'
    LOOP
        RAISE NOTICE 'Policy: %, Roles: %, Command: %', 
            policy_info.policyname, 
            policy_info.roles, 
            policy_info.cmd;
    END LOOP;
    
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- 4. TEST INSERT/UPDATE/DELETE
-- =====================================================

-- Test insert
DO $$
DECLARE
    test_id UUID;
BEGIN
    RAISE NOTICE 'Testing INSERT...';
    
    INSERT INTO public.featured_collections (
        title, 
        description, 
        image_url, 
        display_order, 
        is_active, 
        badge_text, 
        badge_color
    ) VALUES (
        'Test Collection', 
        'Test Description', 
        'https://example.com/test.jpg', 
        999, 
        true, 
        'Test', 
        'purple'
    ) RETURNING id INTO test_id;
    
    RAISE NOTICE '✅ INSERT successful, ID: %', test_id;
    
    -- Test update
    RAISE NOTICE 'Testing UPDATE...';
    
    UPDATE public.featured_collections 
    SET title = 'Updated Test Collection'
    WHERE id = test_id;
    
    RAISE NOTICE '✅ UPDATE successful';
    
    -- Test delete
    RAISE NOTICE 'Testing DELETE...';
    
    DELETE FROM public.featured_collections 
    WHERE id = test_id;
    
    RAISE NOTICE '✅ DELETE successful';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during test: %', SQLERRM;
END $$;

-- =====================================================
-- 5. CHECK PERMISSIONS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'PERMISSIONS CHECK';
    RAISE NOTICE '=====================================================';
    
    -- Check if authenticated role has permissions
    IF has_table_privilege('authenticated', 'public.featured_collections', 'SELECT') THEN
        RAISE NOTICE '✅ authenticated role has SELECT permission';
    ELSE
        RAISE NOTICE '❌ authenticated role does NOT have SELECT permission';
    END IF;
    
    IF has_table_privilege('authenticated', 'public.featured_collections', 'INSERT') THEN
        RAISE NOTICE '✅ authenticated role has INSERT permission';
    ELSE
        RAISE NOTICE '❌ authenticated role does NOT have INSERT permission';
    END IF;
    
    IF has_table_privilege('authenticated', 'public.featured_collections', 'UPDATE') THEN
        RAISE NOTICE '✅ authenticated role has UPDATE permission';
    ELSE
        RAISE NOTICE '❌ authenticated role does NOT have UPDATE permission';
    END IF;
    
    IF has_table_privilege('authenticated', 'public.featured_collections', 'DELETE') THEN
        RAISE NOTICE '✅ authenticated role has DELETE permission';
    ELSE
        RAISE NOTICE '❌ authenticated role does NOT have DELETE permission';
    END IF;
    
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- 6. CHECK CURRENT DATA
-- =====================================================

DO $$
DECLARE
    collection_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO collection_count FROM public.featured_collections;
    RAISE NOTICE 'Current featured collections count: %', collection_count;
    
    IF collection_count > 0 THEN
        RAISE NOTICE 'Sample collections:';
        FOR collection_count IN 
            SELECT id, title, is_active 
            FROM public.featured_collections 
            LIMIT 3
        LOOP
            RAISE NOTICE 'ID: %, Title: %, Active: %', 
                collection_count.id, 
                collection_count.title, 
                collection_count.is_active;
        END LOOP;
    END IF;
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEATURED COLLECTIONS TABLE TEST COMPLETE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Check the output above for any issues.';
    RAISE NOTICE 'If all tests pass, the table is working correctly.';
    RAISE NOTICE '=====================================================';
END $$;
