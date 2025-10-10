import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Eye, Copy, Download, Share2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

type Prompt = Tables<'prompts'> & {
  categories?: Tables<'categories'>;
  is_favorited?: boolean;
};

const Favorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch user's favorite prompts
  const { data: favoritePrompts, isLoading, error } = useQuery({
    queryKey: ['favorite-prompts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          prompts (
            *,
            categories (
              id,
              name,
              slug
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('interaction_type', 'favorite');

      if (error) throw error;
      
      return data?.map(item => ({
        ...item.prompts,
        is_favorited: true
      })) as Prompt[] || [];
    },
    enabled: !!user?.id,
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ promptId, isFavorited }: { promptId: string; isFavorited: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Favorites Mutation: isFavorited =', isFavorited, 'for prompt', promptId);

      if (isFavorited) {
        // Remove from favorites
        console.log('Removing from favorites...');
        const { error } = await supabase
          .from('user_interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId)
          .eq('interaction_type', 'favorite');
        
        if (error) {
          console.error('Error removing from favorites:', error);
          throw error;
        }
        console.log('Successfully removed from favorites');
      } else {
        // Add to favorites
        console.log('Adding to favorites...');
        const { error } = await supabase
          .from('user_interactions')
          .insert({
            user_id: user.id,
            prompt_id: promptId,
            interaction_type: 'favorite'
          });
        
        if (error) {
          console.error('Error adding to favorites:', error);
          throw error;
        }
        console.log('Successfully added to favorites');
      }
    },
    onMutate: async ({ promptId, isFavorited }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorite-prompts'] });
      await queryClient.cancelQueries({ queryKey: ['prompts'] });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData(['favorite-prompts']);
      const previousPrompts = queryClient.getQueryData(['prompts']);

      // Optimistically update the UI
      queryClient.setQueryData(['favorite-prompts'], (old: any) => {
        if (!old) return old;
        if (isFavorited) {
          // Remove from favorites list
          return old.filter((prompt: any) => prompt.id !== promptId);
        } else {
          // Add to favorites list
          return old;
        }
      });

      queryClient.setQueryData(['prompts'], (old: any) => {
        if (!old) return old;
        return old.map((prompt: any) => 
          prompt.id === promptId 
            ? { ...prompt, is_favorited: !isFavorited }
            : prompt
        );
      });

      // If removing from favorites, close modal
      if (isFavorited) {
        setIsModalOpen(false);
        setSelectedPrompt(null);
      }

      // Return a context object with the snapshotted value
      return { previousFavorites, previousPrompts };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorite-prompts'], context.previousFavorites);
      }
      if (context?.previousPrompts) {
        queryClient.setQueryData(['prompts'], context.previousPrompts);
      }
      
      console.error('Toggle favorite error:', err);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status.',
        variant: 'destructive',
      });
    },
    onSuccess: (_, variables) => {
      console.log('Favorites mutation success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['favorite-prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      
      // Show success toast
      toast({
        title: variables.isFavorited ? 'Removed from favorites' : 'Added to favorites',
        description: variables.isFavorited 
          ? 'Prompt has been removed from your favorites.' 
          : 'Prompt has been added to your favorites.',
      });
    },
  });

  const handleToggleFavorite = (prompt: Prompt) => {
    toggleFavoriteMutation.mutate({
      promptId: prompt.id,
      isFavorited: prompt.is_favorited || false
    });
  };

  const handleOpenModal = async (prompt: Prompt) => {
    console.log('Opening modal for prompt:', prompt);
    setSelectedPrompt(prompt);
    setIsModalOpen(true);
    
    // Track view interaction
    try {
      console.log('Tracking view for prompt:', prompt.id);
      
      // Insert view interaction (optional - for analytics)
      const { error: interactionError } = await supabase
        .from('user_interactions')
        .insert({
          prompt_id: prompt.id,
          interaction_type: 'view',
        });
      
      if (interactionError) {
        console.warn('Failed to insert view interaction:', interactionError);
      }

      // Increment view count in prompts table using direct update
      const { data: currentPrompt, error: fetchError } = await supabase
        .from('prompts')
        .select('view_count')
        .eq('id', prompt.id)
        .single();
      
      if (fetchError) {
        console.error('Failed to fetch current view count:', fetchError);
        return;
      }

      const newViewCount = (currentPrompt?.view_count || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('prompts')
        .update({ view_count: newViewCount })
        .eq('id', prompt.id);
      
      if (updateError) {
        console.error('Failed to update view count:', updateError);
        return;
      }

      console.log('View count updated successfully:', newViewCount);

      // Invalidate queries to refresh the view count
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-prompts'] });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleDownloadImage = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Download started',
        description: 'Image is being downloaded to your device.',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Unable to download image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSharePrompt = async (prompt: Prompt) => {
    const shareData = {
      title: prompt.title,
      text: prompt.prompt_text,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: 'Shared successfully',
          description: 'Prompt has been shared.',
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${prompt.title}\n\n${prompt.prompt_text}\n\n${window.location.href}`);
        toast({
          title: 'Copied to clipboard',
          description: 'Prompt details have been copied to your clipboard.',
        });
      }
    } catch (error) {
      toast({
        title: 'Share failed',
        description: 'Unable to share prompt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyPrompt = async (promptText: string, title: string, promptId: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      
      // Track copy interaction
      try {
        // Insert copy interaction
        const { error: interactionError } = await supabase
          .from('user_interactions')
          .insert({
            prompt_id: promptId,
            interaction_type: 'copy',
          });
        
        if (interactionError) throw interactionError;

        // Increment copy count in prompts table
        const { error: copyCountError } = await supabase.rpc('increment_copy_count', {
          prompt_id: promptId
        });
        
        if (copyCountError) throw copyCountError;

        // Invalidate queries to refresh the copy count
        queryClient.invalidateQueries({ queryKey: ['prompts'] });
        queryClient.invalidateQueries({ queryKey: ['favorite-prompts'] });
      } catch (trackingError) {
        console.error('Failed to track copy:', trackingError);
        // Don't show error to user for tracking failures
      }
      
      toast({
        title: 'Copied!',
        description: `"${title}" prompt copied to clipboard.`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy prompt to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return '/placeholder.svg';
    
    // Check if the imagePath is already a complete URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's just a path, generate the public URL
    return supabase.storage.from('prompt-images').getPublicUrl(imagePath).data.publicUrl;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load favorites. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Favorites</h1>
          <p className="text-muted-foreground">
            {favoritePrompts?.length || 0} {favoritePrompts?.length === 1 ? 'prompt' : 'prompts'} saved
          </p>
        </div>
      </div>

      {/* Favorites Grid - Scattered Style */}
      {favoritePrompts && favoritePrompts.length > 0 ? (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {favoritePrompts.map((prompt, index) => {
            // Create varied heights for scattered effect
            const heights = ['h-48', 'h-56', 'h-64', 'h-52', 'h-60', 'h-44'];
            const randomHeight = heights[index % heights.length];
            
            return (
              <div 
                key={prompt.id} 
                className={`break-inside-avoid mb-4 cursor-pointer group`}
                onClick={() => handleOpenModal(prompt)}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 ai-card glass">
                  <div className="relative overflow-hidden bg-black/10">
                    <img
                      src={getImageUrl(prompt.primary_image_url)}
                      alt={prompt.title}
                      className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                    
                    {/* Overlay with gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
                          {prompt.title}
                        </h3>
                        <p className="text-white/80 text-xs line-clamp-2">
                          {prompt.prompt_text}
                        </p>
                      </div>
                    </div>

                    {/* Stats overlay */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                        <Eye className="h-3 w-3 text-white" />
                        <span className="text-white text-xs">{prompt.view_count || 0}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-6 w-6 p-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
                          prompt.is_favorited 
                            ? 'hover:bg-purple-600/90' 
                            : 'hover:bg-purple-500/80'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(prompt);
                        }}
                      >
                        <Heart 
                          className={`h-3 w-3 transition-all duration-300 ${
                            prompt.is_favorited 
                              ? 'text-purple-500 fill-purple-500 scale-110' 
                              : 'text-white hover:text-purple-300'
                          } ${toggleFavoriteMutation.isPending ? 'animate-pulse' : ''}`} 
                        />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground mb-4">
            Start exploring prompts and click the heart icon to save your favorites.
          </p>
          <Button asChild>
            <Link to="/explore">Explore Prompts</Link>
          </Button>
        </div>
      )}

      {/* Prompt Studio Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 glass border-purple-500/20">
          {selectedPrompt && (
            <div className="flex gap-0 overflow-hidden h-full">
              {/* Left side - Image (60% width) */}
              <div className="w-[60%] min-w-0">
                <div className="relative h-full rounded-l-lg overflow-hidden bg-black/20 flex items-center justify-center">
                  <img
                    src={getImageUrl(selectedPrompt.primary_image_url)}
                    alt={selectedPrompt.title}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                  
                  {/* Image overlay actions */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="bg-purple-500/20 backdrop-blur-sm hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/30"
                      onClick={() => handleDownloadImage(getImageUrl(selectedPrompt.primary_image_url), selectedPrompt.title)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="bg-purple-500/20 backdrop-blur-sm hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/30"
                      onClick={() => handleSharePrompt(selectedPrompt)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right side - Prompt details (40% width) */}
              <div className="w-[40%] min-w-0 space-y-6 overflow-y-auto p-6">
                {/* Title moved to right column */}
                <div>
                  <h2 className="text-2xl font-bold gradient-text mb-2">
                    {selectedPrompt.title}
                  </h2>
                </div>
                {/* Category and badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {selectedPrompt.categories?.name || 'Uncategorized'}
                  </Badge>
                  <Badge variant="outline">
                    {selectedPrompt.media_type}
                  </Badge>
                  <Badge 
                    variant={selectedPrompt.difficulty_level === 'beginner' ? 'default' : 
                           selectedPrompt.difficulty_level === 'intermediate' ? 'secondary' : 'destructive'}
                  >
                    {selectedPrompt.difficulty_level}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {selectedPrompt.view_count || 0} views
                  </div>
                  <div className="flex items-center gap-1">
                    <Copy className="h-4 w-4" />
                    {selectedPrompt.copy_count || 0} copies
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {selectedPrompt.view_count || 0} likes
                  </div>
                </div>


                {/* Style tags */}
                {selectedPrompt.style_tags && selectedPrompt.style_tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Style Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPrompt.style_tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt */}
                {selectedPrompt.prompt_text && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Prompt</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedPrompt.prompt_text}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border/50">
                  <Button 
                    onClick={() => handleCopyPrompt(selectedPrompt.prompt_text, selectedPrompt.title, selectedPrompt.id)}
                    className="flex-1 ai-button"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Prompt
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleToggleFavorite(selectedPrompt)}
                    disabled={toggleFavoriteMutation.isPending}
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      selectedPrompt.is_favorited 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30' 
                        : 'hover:bg-purple-500/10 border-purple-500/20'
                    }`}
                  >
                    <Heart 
                      className={`h-4 w-4 transition-all duration-300 ${
                        selectedPrompt.is_favorited 
                          ? 'text-purple-400 fill-purple-400 scale-110' 
                          : 'text-muted-foreground hover:text-purple-400'
                      } ${toggleFavoriteMutation.isPending ? 'animate-pulse' : ''}`} 
                    />
                    {toggleFavoriteMutation.isPending 
                      ? 'Updating...' 
                      : selectedPrompt.is_favorited 
                        ? 'Liked' 
                        : 'Like'
                    }
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Favorites;
