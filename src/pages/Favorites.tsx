import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Eye, Copy, Download } from 'lucide-react';
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
    setSelectedPrompt(prompt);
    setIsModalOpen(true);
    
    // Track view interaction
    try {
      console.log('Tracking view for prompt:', prompt.id);
      
      // Insert view interaction
      const { error: interactionError } = await supabase
        .from('user_interactions')
        .insert({
          prompt_id: prompt.id,
          interaction_type: 'view',
        });
      
      if (interactionError) throw interactionError;

      // Increment view count in prompts table
      const { error: viewCountError } = await supabase.rpc('increment_view_count', {
        prompt_id: prompt.id
      });
      
      if (viewCountError) throw viewCountError;

      console.log('View tracked successfully for prompt:', prompt.id);

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

      {/* Favorites Grid */}
      {favoritePrompts && favoritePrompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoritePrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="break-inside-avoid mb-4 cursor-pointer group"
              onClick={() => handleOpenModal(prompt)}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={getImageUrl(prompt.primary_image_url)}
                    alt={prompt.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                          ? 'hover:bg-red-600/90' 
                          : 'hover:bg-red-500/80'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(prompt);
                      }}
                    >
                      <Heart 
                        className={`h-3 w-3 transition-all duration-300 ${
                          prompt.is_favorited 
                            ? 'text-red-500 fill-red-500 scale-110' 
                            : 'text-white hover:text-red-300'
                        } ${toggleFavoriteMutation.isPending ? 'animate-pulse' : ''}`} 
                      />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
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

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-semibold">
              {selectedPrompt?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPrompt && (
            <div className="flex gap-6 overflow-hidden">
              {/* Left side - Image */}
              <div className="flex-1 min-w-0">
                <div className="relative h-96 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={getImageUrl(selectedPrompt.primary_image_url)}
                    alt={selectedPrompt.title}
                    className="w-full h-full object-cover"
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
                      className="bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
                      onClick={() => handleDownloadImage(getImageUrl(selectedPrompt.primary_image_url), selectedPrompt.title)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
                      onClick={() => handleSharePrompt(selectedPrompt)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right side - Content */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Prompt text */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Prompt</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedPrompt.prompt_text}
                  </p>
                </div>

                {/* Category */}
                {selectedPrompt.categories && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Category</h3>
                    <Badge variant="secondary">{selectedPrompt.categories.name}</Badge>
                  </div>
                )}

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

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => handleCopyPrompt(selectedPrompt.prompt_text, selectedPrompt.title, selectedPrompt.id)}
                    className="flex-1"
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
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Heart 
                      className={`h-4 w-4 transition-all duration-300 ${
                        selectedPrompt.is_favorited 
                          ? 'text-red-500 fill-red-500 scale-110' 
                          : 'text-muted-foreground hover:text-red-400'
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
