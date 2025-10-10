-- Insert sample categories
INSERT INTO public.categories (id, name, description, slug, cover_image_url) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Digital Art', 'AI-generated digital artwork and illustrations', 'digital-art', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400'),
('550e8400-e29b-41d4-a716-446655440002', 'Photography', 'Photography styles and techniques for AI image generation', 'photography', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400'),
('550e8400-e29b-41d4-a716-446655440003', 'Character Design', 'Character creation and design prompts for AI', 'character-design', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400'),
('550e8400-e29b-41d4-a716-446655440004', 'Architecture', 'Architectural visualization and design prompts', 'architecture', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400'),
('550e8400-e29b-41d4-a716-446655440005', 'Nature & Landscapes', 'Natural landscapes and environmental scenes', 'nature-landscapes', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400');

-- Insert sample prompts
INSERT INTO public.prompts (id, title, prompt_text, category_id, media_type, style_tags, industry_tags, difficulty_level, popularity_score, view_count, copy_count, primary_image_url) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Cyberpunk Cityscape', 'Create a futuristic cyberpunk cityscape at night with neon lights, flying cars, towering skyscrapers, and a dark, moody atmosphere. Include rain-soaked streets reflecting the neon glow, holographic advertisements, and a sense of urban decay mixed with high technology.', '550e8400-e29b-41d4-a716-446655440001', 'image', ARRAY['cyberpunk', 'neon', 'futuristic', 'dark'], ARRAY['gaming', 'entertainment', 'tech'], 'intermediate', 150, 45, 12, 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600'),
('660e8400-e29b-41d4-a716-446655440002', 'Portrait Photography Style', 'Professional portrait photography with soft lighting, shallow depth of field, and natural skin tones. Capture genuine emotion and personality with a clean, minimalist background. Use a 85mm lens perspective with warm, golden hour lighting.', '550e8400-e29b-41d4-a716-446655440002', 'image', ARRAY['portrait', 'professional', 'soft lighting', 'minimalist'], ARRAY['photography', 'marketing', 'social media'], 'beginner', 200, 78, 25, 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=600'),
('660e8400-e29b-41d4-a716-446655440003', 'Fantasy Warrior Character', 'Design a powerful fantasy warrior character with intricate armor, magical weapons, and detailed facial features. Include mystical elements like glowing runes, ethereal energy, and a heroic pose. Focus on character personality and backstory through visual design.', '550e8400-e29b-41d4-a716-446655440003', 'image', ARRAY['fantasy', 'warrior', 'armor', 'magical'], ARRAY['gaming', 'fantasy', 'entertainment'], 'advanced', 180, 62, 18, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600'),
('660e8400-e29b-41d4-a716-446655440004', 'Modern Minimalist House', 'Architectural visualization of a modern minimalist house with clean lines, large glass windows, and natural materials. Include sustainable design elements, open floor plan, and seamless indoor-outdoor connection. Use natural lighting and neutral color palette.', '550e8400-e29b-41d4-a716-446655440004', 'image', ARRAY['modern', 'minimalist', 'architecture', 'clean'], ARRAY['architecture', 'real estate', 'design'], 'intermediate', 120, 35, 8, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600'),
('660e8400-e29b-41d4-a716-446655440005', 'Mountain Lake Serenity', 'Peaceful mountain lake scene with crystal clear water reflecting snow-capped peaks. Include pine trees, morning mist, and golden sunlight filtering through clouds. Capture the tranquility and majesty of untouched wilderness.', '550e8400-e29b-41d4-a716-446655440005', 'image', ARRAY['nature', 'mountains', 'lake', 'serene'], ARRAY['travel', 'wellness', 'nature'], 'beginner', 95, 28, 6, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600'),
('660e8400-e29b-41d4-a716-446655440006', 'Abstract Digital Art', 'Create abstract digital art with flowing organic shapes, vibrant colors, and dynamic composition. Use gradient transitions, geometric patterns, and artistic brush strokes. Focus on emotional expression through color and form.', '550e8400-e29b-41d4-a716-446655440001', 'image', ARRAY['abstract', 'digital art', 'colorful', 'flowing'], ARRAY['art', 'design', 'creative'], 'intermediate', 110, 42, 15, 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600'),
('660e8400-e29b-41d4-a716-446655440007', 'Product Photography Setup', 'Professional product photography with studio lighting, clean white background, and perfect product placement. Use softbox lighting to eliminate shadows, proper depth of field, and high-resolution detail capture. Focus on commercial quality presentation.', '550e8400-e29b-41d4-a716-446655440002', 'image', ARRAY['product', 'studio', 'commercial', 'clean'], ARRAY['e-commerce', 'marketing', 'retail'], 'intermediate', 160, 55, 22, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'),
('660e8400-e29b-41d4-a716-446655440008', 'Sci-Fi Robot Character', 'Design a futuristic robot character with sleek metallic surfaces, glowing blue accents, and humanoid proportions. Include advanced technology details, LED lighting effects, and a sense of both power and intelligence. Focus on mechanical precision and futuristic aesthetics.', '550e8400-e29b-41d4-a716-446655440003', 'image', ARRAY['sci-fi', 'robot', 'futuristic', 'mechanical'], ARRAY['gaming', 'sci-fi', 'technology'], 'advanced', 140, 48, 14, 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600'),
('660e8400-e29b-41d4-a716-446655440009', 'Sustainable Office Building', 'Modern sustainable office building with green walls, solar panels, and energy-efficient design. Include biophilic elements, natural ventilation, and eco-friendly materials. Show integration with urban environment and sustainable technology.', '550e8400-e29b-41d4-a716-446655440004', 'image', ARRAY['sustainable', 'modern', 'green', 'office'], ARRAY['architecture', 'sustainability', 'business'], 'advanced', 90, 32, 7, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600'),
('660e8400-e29b-41d4-a716-446655440010', 'Forest Path Adventure', 'Enchanting forest path winding through ancient trees with dappled sunlight, moss-covered rocks, and wildflowers. Create a sense of adventure and discovery with natural lighting, depth, and atmospheric perspective. Include wildlife elements and natural textures.', '550e8400-e29b-41d4-a716-446655440005', 'image', ARRAY['forest', 'path', 'nature', 'adventure'], ARRAY['travel', 'outdoor', 'adventure'], 'beginner', 75, 25, 5, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600');

-- Create functions for incrementing counters (if they don't exist)
CREATE OR REPLACE FUNCTION public.increment_view_count(prompt_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.prompts 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_copy_count(prompt_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.prompts 
  SET copy_count = COALESCE(copy_count, 0) + 1
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
