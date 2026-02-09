import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  Eye,
  Heart,
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Prompt = Tables<'prompts'> & {
  categories?: Tables<'categories'>;
};

const PromptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Fetch prompt details
  const { data: prompt, isLoading, error } = useQuery({
    queryKey: ['prompt', id],
    queryFn: async () => {
      if (!id) throw new Error('Prompt ID is required');

      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            description
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Prompt;
    },
    enabled: !!id,
  });

  // Track view when component mounts
  useQuery({
    queryKey: ['track-view', id],
    queryFn: async () => {
      if (!id) return;

      try {
        const { error } = await supabase
          .from('user_interactions')
          .insert({
            prompt_id: id,
            interaction_type: 'view',
          });

        if (error) throw error;

        // Update view count
        await supabase.rpc('increment_view_count', { prompt_id: id });
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    },
    enabled: !!id && !!prompt,
  });

  const handleCopyPrompt = async () => {
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt.prompt_text);

      // Track copy interaction (fire and forget for the interaction record)
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.id) {
          await supabase
            .from('user_interactions')
            .upsert(
              {
                prompt_id: prompt.id,
                interaction_type: 'copy',
                user_id: user.id
              },
              { onConflict: 'user_id, prompt_id, interaction_type', ignoreDuplicates: true }
            );
        }
      } catch (err) {
        console.warn('Interaction tracking failed:', err);
      }

      // Increment copy count (always try to increment for feedback)
      try {
        await supabase.rpc('increment_copy_count', { prompt_id: prompt.id });
      } catch (err) {
        console.warn('Increment count failed:', err);
      }

      // Refresh the prompt data to show updated copy count
      queryClient.invalidateQueries({ queryKey: ['prompt', prompt.id] });

      toast({
        title: 'Copied!',
        description: `"${prompt.title}" has been copied to your clipboard.`,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFavorite = async () => {
    if (!prompt) return;

    try {
      const { error } = await supabase
        .from('user_interactions')
        .insert({
          prompt_id: prompt.id,
          interaction_type: 'favorite',
        });

      if (error) throw error;

      toast({
        title: 'Added to favorites!',
        description: 'This prompt has been saved to your favorites.',
      });
    } catch (error) {
      toast({
        title: 'Failed to favorite',
        description: 'Unable to add to favorites. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading prompt...</p>
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Prompt not found or failed to load.</p>
        <Button asChild>
          <Link to="/explore">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Explore
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/explore">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Explore
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{prompt.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(prompt.created_at || '').toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {prompt.view_count || 0} views
            </div>
            <div className="flex items-center gap-1">
              <Copy className="h-4 w-4" />
              {prompt.copy_count || 0} copies
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Prompt Text */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Prompt Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {prompt.prompt_text}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCopyPrompt} className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Prompt
                </Button>
                <Button variant="outline" onClick={handleFavorite}>
                  <Heart className="mr-2 h-4 w-4" />
                  Favorite
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          {(prompt.primary_image_url || prompt.before_image_url || prompt.after_image_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Images
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prompt.primary_image_url && (
                  <div>
                    <h4 className="font-medium mb-2">Primary Image</h4>
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={prompt.primary_image_url}
                        alt={prompt.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {(prompt.before_image_url || prompt.after_image_url) && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {prompt.before_image_url && (
                      <div>
                        <h4 className="font-medium mb-2">Before</h4>
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <img
                            src={prompt.before_image_url}
                            alt="Before"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {prompt.after_image_url && (
                      <div>
                        <h4 className="font-medium mb-2">After</h4>
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <img
                            src={prompt.after_image_url}
                            alt="After"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Category */}
        {prompt.categories && (
          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to={`/categories/${prompt.categories.slug}`}>
                  <Tag className="mr-2 h-4 w-4" />
                  {prompt.categories.name}
                </Link>
              </Button>
              {prompt.categories.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {prompt.categories.description}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm">Media Type</h4>
              <Badge variant="secondary" className="mt-1">
                {prompt.media_type}
              </Badge>
            </div>

            <div>
              <h4 className="font-medium text-sm">Difficulty</h4>
              <Badge
                variant={prompt.difficulty_level === 'beginner' ? 'default' :
                  prompt.difficulty_level === 'intermediate' ? 'secondary' : 'destructive'}
                className="mt-1"
              >
                {prompt.difficulty_level}
              </Badge>
            </div>

            <div>
              <h4 className="font-medium text-sm">Popularity Score</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {prompt.popularity_score || 0} points
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {(prompt.style_tags?.length || prompt.industry_tags?.length) && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prompt.style_tags?.length && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Style Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {prompt.style_tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {prompt.industry_tags?.length && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Industry Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {prompt.industry_tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/explore">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse More Prompts
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/prompts/new">
                Create Similar Prompt
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptDetail;
