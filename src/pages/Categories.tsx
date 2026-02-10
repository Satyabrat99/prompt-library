import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { Grid3X3, ArrowRight, Image as ImageIcon, Sparkles, TrendingUp } from 'lucide-react';
import type { Tables } from '../integrations/supabase/types';

type Category = Tables<'categories'> & {
  prompt_count?: number;
};

const Categories = () => {
  // Fetch categories with prompt counts
  // Fetch categories (reuse cache entirely if possible)
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'], // Matches Explore.tsx key to share cache!
    queryFn: async () => {
      console.log('Categories: Fetching categories...');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Categories fetch error:', error);
        throw error;
      }

      return data.map(cat => ({
        ...cat,
        prompt_count: 0 // Placeholder
      })) as Category[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load categories. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* PromptVault Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-400">Prompt Categories</span>
        </div>
        <h1 className="text-4xl font-bold gradient-text">
          Explore Categories
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Discover prompts organized by category, style, and industry
        </p>
      </div>

      {categories?.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Grid3X3 className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-700">No categories yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Categories help organize prompts by topic and style. Check back later for new content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category, index) => (
            <Card
              key={category.id}
              className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm rounded-2xl ai-card glass"
            >
              {/* Cover Image - Landscape Mode */}
              <div className="relative aspect-[16/9] overflow-hidden">
                {category.cover_image_url ? (
                  <img
                    src={category.cover_image_url}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-3xl">
                        {category.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-transparent" />

                {/* Text Overlay - Top Left */}
                <div className="absolute top-4 left-4 z-10">
                  <CardTitle className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
                    {category.name}
                  </CardTitle>
                  <CardDescription className="text-white/90 text-sm drop-shadow-md">
                    {category.description || 'Explore creative prompts'}
                  </CardDescription>
                </div>

                {/* Action Button - Bottom Right */}
                <div className="absolute bottom-4 right-4 z-10">
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-10 w-10 rounded-full bg-purple-500/20 backdrop-blur-sm hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 transition-all duration-300 group/btn p-0 border border-purple-500/30 ai-button"
                  >
                    <Link to={`/categories/${category.slug}`}>
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                </div>

                {/* Prompt Count - Bottom Left */}
                <div className="absolute bottom-4 left-4 z-10">
                  <div className="flex items-center gap-2 text-sm text-white/90 drop-shadow-md bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="font-medium">{category.prompt_count}</span>
                    <span>prompts</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI Studio Quick Actions */}
      <div className="glass rounded-2xl p-8 border border-purple-500/20 glow">
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold gradient-text">Ready to Explore?</h3>
          <p className="text-muted-foreground text-lg">
            Discover thousands of creative AI prompts across all categories
          </p>
          <Button
            asChild
            className="ai-button px-8 py-3 text-lg"
          >
            <Link to="/explore">
              <Grid3X3 className="mr-2 h-5 w-5" />
              Browse All Prompts
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Categories;
