import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Copy, Eye, Heart, X, Download, Share2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import type { Tables } from '../integrations/supabase/types';

type Prompt = Tables<'prompts'> & {
  categories?: Tables<'categories'>;
  is_favorited?: boolean;
};

const Explore = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch prompts with categories and favorite status
  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ['prompts', selectedCategory, selectedMediaType, selectedDifficulty, searchTerm, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('prompts')
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }
      
      if (selectedMediaType !== 'all') {
        query = query.eq('media_type', selectedMediaType as any);
      }
      
      if (selectedDifficulty !== 'all') {
        query = query.eq('difficulty_level', selectedDifficulty as any);
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,prompt_text.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Get favorite status for each prompt if user is logged in
      if (user?.id && data) {
        const promptIds = data.map(p => p.id);
        const { data: favorites } = await supabase
          .from('user_interactions')
          .select('prompt_id')
          .eq('user_id', user.id)
          .eq('interaction_type', 'favorite')
          .in('prompt_id', promptIds);
        
        const favoriteIds = new Set(favorites?.map(f => f.prompt_id) || []);
        
        return data.map(prompt => ({
          ...prompt,
          is_favorited: favoriteIds.has(prompt.id)
        })) as Prompt[];
      }
      
      return data as Prompt[];
    },
    enabled: true, // Always fetch prompts
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: true, // Always fetch categories
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ promptId, isFavorited }: { promptId: string; isFavorited: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Mutation: isFavorited =', isFavorited, 'for prompt', promptId);

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
      await queryClient.cancelQueries({ queryKey: ['prompts'] });
      await queryClient.cancelQueries({ queryKey: ['favorite-prompts'] });

      // Snapshot the previous value
      const previousPrompts = queryClient.getQueryData(['prompts']);
      const previousFavorites = queryClient.getQueryData(['favorite-prompts']);

      // Optimistically update the UI
      queryClient.setQueryData(['prompts'], (old: any) => {
        if (!old) return old;
        return old.map((prompt: any) => 
          prompt.id === promptId 
            ? { ...prompt, is_favorited: !isFavorited }
            : prompt
        );
      });

      queryClient.setQueryData(['favorite-prompts'], (old: any) => {
        if (!old) return old;
        if (isFavorited) {
          // Remove from favorites list
          return old.filter((prompt: any) => prompt.id !== promptId);
        } else {
          // Add to favorites list (this won't be called for explore page)
          return old;
        }
      });

      // Return a context object with the snapshotted value
      return { previousPrompts, previousFavorites };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPrompts) {
        queryClient.setQueryData(['prompts'], context.previousPrompts);
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorite-prompts'], context.previousFavorites);
      }
      
      console.error('Toggle favorite error:', err);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status.',
        variant: 'destructive',
      });
    },
    onSuccess: (_, variables) => {
      console.log('Mutation success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-prompts'] });
      
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
    console.log('Toggling favorite for prompt:', prompt.id, 'Current status:', prompt.is_favorited);
    
    toggleFavoriteMutation.mutate({
      promptId: prompt.id,
      isFavorited: prompt.is_favorited || false
    });
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
        const { error: copyCountError } = await (supabase as any).rpc('increment_copy_count', {
          prompt_id: promptId
        });
        
        if (copyCountError) throw copyCountError;

        // Invalidate queries to refresh the copy count
        queryClient.invalidateQueries({ queryKey: ['prompts'] });
      } catch (trackingError) {
        console.error('Failed to track copy:', trackingError);
        // Don't show error to user for tracking failures
      }
      
      toast({
        title: 'Copied!',
        description: `"${title}" has been copied to your clipboard.`,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewPrompt = async (promptId: string) => {
    // Track view interaction
    try {
      console.log('Tracking view for prompt:', promptId);
      
      // Insert view interaction
      const { error: interactionError } = await supabase
        .from('user_interactions')
        .insert({
          prompt_id: promptId,
          interaction_type: 'view',
        });
      
      if (interactionError) throw interactionError;

      // Increment view count in prompts table
      const { error: viewCountError } = await (supabase as any).rpc('increment_view_count', {
        prompt_id: promptId
      });
      
      if (viewCountError) throw viewCountError;

      console.log('View tracked successfully for prompt:', promptId);

      // Invalidate queries to refresh the view count
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const handleOpenModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsModalOpen(true);
    handleViewPrompt(prompt.id);
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

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) {
      console.log('No image path provided, using placeholder');
      return '/placeholder.svg';
    }
    
    // Check if the imagePath is already a complete URL
    if (imagePath.startsWith('http')) {
      console.log('Image path is already a complete URL:', imagePath);
      return imagePath;
    }
    
    // If it's just a path, generate the public URL
    const publicUrl = supabase.storage.from('prompt-images').getPublicUrl(imagePath).data.publicUrl;
    console.log('Generated image URL:', publicUrl, 'from path:', imagePath);
    return publicUrl;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load prompts. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Studio Search and Filters */}
      <div className="glass rounded-2xl p-6 border border-green-500/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
              <Input
                placeholder="Search AI prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-background/50 border-green-500/20 focus:border-green-500/50 focus:ring-green-500/20"
              />
            </div>
          </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-40 h-12 bg-background/50 border-green-500/20 focus:border-green-500/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
          <SelectTrigger className="w-full md:w-32 h-12 bg-background/50 border-green-500/20 focus:border-green-500/50">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-full md:w-32 h-12 bg-background/50 border-green-500/20 focus:border-green-500/50">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Results - Scattered Grid */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {prompts?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No prompts found matching your criteria.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search filters or check back later for new content.
            </p>
          </div>
        ) : (
          prompts?.map((prompt, index) => {
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
                  <div className={`relative ${randomHeight} overflow-hidden`}>
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
                        className={`h-6 w-6 p-0 bg-green-500/20 backdrop-blur-sm transition-all duration-300 ${
                          prompt.is_favorited 
                            ? 'hover:bg-green-600/90' 
                            : 'hover:bg-green-500/80'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(prompt);
                        }}
                      >
                        <Heart 
                          className={`h-3 w-3 transition-all duration-300 ${
                            prompt.is_favorited 
                              ? 'text-green-400 fill-green-400 scale-110' 
                              : 'text-white hover:text-green-300'
                          } ${toggleFavoriteMutation.isPending ? 'animate-pulse' : ''}`} 
                        />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* AI Studio Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 glass border-green-500/20">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-semibold gradient-text">
              {selectedPrompt?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPrompt && (
            <div className="flex gap-6 overflow-hidden px-6 pb-6">
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
                      className="bg-green-500/20 backdrop-blur-sm hover:bg-green-500/30 text-green-400 hover:text-green-300 transition-colors border border-green-500/30"
                      onClick={() => handleDownloadImage(getImageUrl(selectedPrompt.primary_image_url), selectedPrompt.title)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="bg-green-500/20 backdrop-blur-sm hover:bg-green-500/30 text-green-400 hover:text-green-300 transition-colors border border-green-500/30"
                      onClick={() => handleSharePrompt(selectedPrompt)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right side - Prompt details */}
              <div className="flex-1 min-w-0 space-y-4 overflow-y-auto">
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

                {/* Prompt text */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Prompt</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedPrompt.prompt_text}</p>
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

                {/* Description */}
                {selectedPrompt.prompt_text && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedPrompt.prompt_text}</p>
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
                        ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30' 
                        : 'hover:bg-green-500/10 border-green-500/20'
                    }`}
                  >
                    <Heart 
                      className={`h-4 w-4 transition-all duration-300 ${
                        selectedPrompt.is_favorited 
                          ? 'text-green-400 fill-green-400 scale-110' 
                          : 'text-muted-foreground hover:text-green-400'
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

export default Explore;
