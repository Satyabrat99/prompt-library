import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Copy, Eye, Heart, X, Download, Share2, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useCredits } from '../hooks/useCredits';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '../integrations/supabase/types';

type Prompt = Tables<'prompts'> & {
  categories?: Tables<'categories'>;
  is_favorited?: boolean;
  is_unlocked?: boolean;
};

type FeaturedCollection = Tables<'featured_collections'> & {
  categories?: Tables<'categories'>;
};

const Explore = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { spendPromptCredit, isSpendingCredit } = useCredits();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch prompts with pagination
  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ['prompts', selectedCategory, selectedMediaType, selectedModel, debouncedSearchTerm, user?.id, page],
    queryFn: async () => {
      const ITEMS_PER_PAGE = 20;
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

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
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      if (selectedMediaType !== 'all') {
        query = query.eq('media_type', selectedMediaType as any);
      }

      if (selectedModel !== 'all') {
        query = query.eq('model', selectedModel as any);
      }

      // Apply search
      if (debouncedSearchTerm) {
        // Match title, prompt text, model, and tag membership (supports spaces via quoted element)
        const term = debouncedSearchTerm;
        const quoted = JSON.stringify(term); // e.g. "photo realistic" => "\"photo realistic\""
        query = query.or(
          `title.ilike.%${term}%,prompt_text.ilike.%${term}%,model.ilike.%${term}%,style_tags.cs.{${quoted}},industry_tags.cs.{${quoted}}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get favorite status and unlocked status for each prompt if user is logged in
      if (user?.id && data) {
        const promptIds = data.map(p => p.id);

        const [favoritesRes, unlockedRes] = await Promise.all([
          supabase
            .from('user_interactions')
            .select('prompt_id')
            .eq('user_id', user.id)
            .eq('interaction_type', 'favorite')
            .in('prompt_id', promptIds),
          (supabase as any)
            .from('user_unlocked_prompts')
            .select('prompt_id')
            .eq('user_id', user.id)
            .in('prompt_id', promptIds),
        ]);

        const favoriteIds = new Set((favoritesRes.data || []).map(f => f.prompt_id));
        const unlockedIds = new Set((unlockedRes.data || []).map(u => u.prompt_id));

        return data.map(prompt => ({
          ...prompt,
          is_favorited: favoriteIds.has(prompt.id),
          is_unlocked: unlockedIds.has(prompt.id),
        })) as Prompt[];
      }

      return (data as Prompt[]).map(p => ({ ...p, is_unlocked: false }));
    },
    enabled: true, // Always fetch prompts
    refetchOnMount: 'always', // Force refetch when Component mounts (navigating back)
  });

  // Update allPrompts when new data arrives
  useEffect(() => {
    console.log('Explore: prompts changed', {
      promptsLen: prompts?.length,
      page,
      isLoading,
      hasPrompts: !!prompts
    });

    if (prompts) {
      if (page === 0) {
        console.log('Explore: Setting allPrompts for page 0');
        // Reset for new search/filter
        setAllPrompts(prompts);
      } else {
        console.log('Explore: Appending prompts');
        // Append new prompts
        setAllPrompts(prev => [...prev, ...prompts]);
      }

      // Check if we have more data
      setHasMore(prompts.length === 20); // Assuming 20 items per page
      setIsLoadingMore(false);
    }
  }, [prompts, page]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setAllPrompts([]);
    setHasMore(true);
  }, [selectedCategory, selectedMediaType, selectedModel, debouncedSearchTerm]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Reset state when leaving the page
      setSelectedPrompt(null);
      setIsModalOpen(false);
    };
  }, []);

  // Load more prompts
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  }, [isLoadingMore, hasMore]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

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

  // Fetch featured collections
  const { data: featuredCollections } = useQuery({
    queryKey: ['featured-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_collections')
        .select(`
          *,
          categories:categories!featured_collections_redirect_category_id_fkey (name, slug)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as FeaturedCollection[];
    },
  });

  // Fetch distinct models for filter
  const { data: models } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('model')
        .not('model', 'is', null)
        .order('model');
      if (error) throw error;
      const uniq = Array.from(new Set((data || []).map((r: any) => r.model).filter(Boolean)));
      return uniq as string[];
    },
  });

  // Fetch user profile for username
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch fresh prompt details when modal is open
  const { data: freshPrompt } = useQuery({
    queryKey: ['prompt', selectedPrompt?.id],
    queryFn: async () => {
      if (!selectedPrompt?.id) return null;
      console.log('Fetching fresh details for prompt:', selectedPrompt.id);

      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', selectedPrompt.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPrompt?.id,
  });

  // Update selectedPrompt with fresh data when available
  useEffect(() => {
    if (freshPrompt && selectedPrompt && freshPrompt.id === selectedPrompt.id) {
      // Merge fresh data but keep local UI state like is_unlocked if it was optimistically updated
      // Actually, we should trust the DB for copy_count and view_count
      setSelectedPrompt(prev => prev ? {
        ...prev,
        copy_count: freshPrompt.copy_count,
        view_count: freshPrompt.view_count
      } : null);
    }
  }, [freshPrompt]);

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
      await queryClient.cancelQueries({ queryKey: ['favorite-prompts'] });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData(['favorite-prompts']);

      // Optimistically update the UI for favorites page only
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

      // We do NOT update 'prompts' cache here because the key is complex (filters, page, etc).
      // We rely on invalidateQueries in onSuccess/onSettled to refresh Explore page.

      // Return a context object with the snapshotted value
      return { previousFavorites };
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

        // Update local state immediately
        if (selectedPrompt && selectedPrompt.id === promptId) {
          setSelectedPrompt(prev => prev ? { ...prev, copy_count: (prev.copy_count || 0) + 1 } : null);
        }

        setAllPrompts(prev => prev.map(p =>
          p.id === promptId ? { ...p, copy_count: (p.copy_count || 0) + 1 } : p
        ));

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
    try {
      console.log('🔍 Tracking view for prompt (no charge):', promptId);

      // Method 1: Try using existing RPC increment if available
      console.log('📊 Trying RPC function increment_view_count...');
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('increment_view_count', {
        prompt_id: promptId
      });

      if (!rpcError) {
        console.log('✅ RPC function worked!', rpcData);
        await queryClient.invalidateQueries({ queryKey: ['prompts'] });
        return;
      }

      console.log('⚠️ RPC function failed, trying direct update...', rpcError);

      // Method 2: Simple increment approach
      console.log('📊 Trying simple increment...');
      const { data: currentPrompt, error: fetchError } = await supabase
        .from('prompts')
        .select('view_count, title')
        .eq('id', promptId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch current view count:', fetchError);
        return;
      }

      const currentCount = currentPrompt?.view_count || 0;
      const newViewCount = currentCount + 1;

      console.log(`📈 Updating view count: ${currentCount} → ${newViewCount}`);

      const { data: updateData, error: updateError } = await supabase
        .from('prompts')
        .update({
          view_count: newViewCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId)
        .select('view_count, title');

      if (updateError) {
        console.error('❌ All methods failed. Update error:', updateError);
        console.error('Full error details:', JSON.stringify(updateError, null, 2));

        // Try one more approach - insert into user_interactions as fallback (already charged)
        console.log('🔄 Trying fallback: insert into user_interactions...');
        const { error: fallbackError } = await supabase
          .from('user_interactions')
          .insert({
            prompt_id: promptId,
            interaction_type: 'view',
            created_at: new Date().toISOString()
          });

        if (!fallbackError) {
          console.log('✅ Fallback method worked - view tracked in user_interactions');
        } else {
          console.error('❌ Fallback also failed:', fallbackError);
        }
        return;
      }

      console.log('✅ Simple increment worked!');
      console.log('📊 Updated data:', updateData);
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });

    } catch (error) {
      console.error('💥 Complete failure:', error);
      console.error('Error stack:', error.stack);
    }
  };

  const handleOpenModal = (prompt: Prompt) => {
    console.log('🎯 Opening modal for prompt:', prompt.title, 'ID:', prompt.id);
    setSelectedPrompt(prompt);
    setIsModalOpen(true);
    handleViewPrompt(prompt.id);
  };

  const handleUnlockInModal = async (prompt: Prompt) => {
    try {
      const spend = await spendPromptCredit(prompt.id);
      if (!spend?.success) {
        toast({
          title: 'Insufficient credits',
          description: 'You have used all your monthly credits.',
          variant: 'destructive',
        });
        return;
      }

      // Persist unlocked state as a fallback (RPC should already do this)
      try {
        const { error: unlockErr } = await (supabase as any)
          .from('user_unlocked_prompts')
          .upsert({ user_id: user?.id as string, prompt_id: prompt.id });
        if (unlockErr) {
          // Non-fatal; UI will still reflect unlocked locally
          console.warn('unlock upsert warning:', unlockErr);
        }
      } catch (e) {
        console.warn('unlock upsert exception:', e);
      }

      // Optimistically mark unlocked in list and in selected prompt
      setAllPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, is_unlocked: true } : p));
      setSelectedPrompt(prev => prev ? { ...prev, is_unlocked: true } as Prompt : prev);

      toast({ title: 'Unlocked', description: 'Prompt unlocked successfully.' });
    } catch (err: any) {
      console.error('unlock error:', err);
      toast({
        title: 'Unlock failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  // Debug function to test view count update
  const testViewCountUpdate = async (promptId: string) => {
    console.log('🧪 Testing view count update for:', promptId);
    await handleViewPrompt(promptId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleFeaturedCollectionClick = (collection: FeaturedCollection) => {
    if (collection.redirect_category_id && collection.categories?.slug) {
      // Navigate to categories page with the specific category
      navigate(`/categories?category=${collection.categories.slug}`);
    } else if (collection.redirect_category_id) {
      // Fallback: navigate to categories page
      navigate('/categories');
    }
  };

  const getBadgeColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      green: 'bg-green-500/20 text-green-300 border-green-500/30',
      red: 'bg-red-500/20 text-red-300 border-red-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
    return colorMap[color] || colorMap.purple;
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
    <div className="space-y-6">
      {/* Top Section with Greeting and Search */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Personalized Greeting */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">
            Hello, {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-slate-300 text-lg">
            Let's get started!
          </p>
        </div>

        {/* Search and Filters - Top Right */}
        <div className="w-full md:w-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500" />
              <Input
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-background/50 border-purple-500/20 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-full w-full md:w-64"
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-36 h-10 bg-background/50 border-purple-500/20 focus:border-purple-500/50 rounded-full">
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
                <SelectTrigger className="w-full md:w-28 h-10 bg-background/50 border-purple-500/20 focus:border-purple-500/50 rounded-full">
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

              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full md:w-40 h-10 bg-background/50 border-purple-500/20 focus:border-purple-500/50 rounded-full">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {(models || []).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Collections - Dynamic 3 Card Row */}
      {featuredCollections && featuredCollections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredCollections.slice(0, 3).map((collection) => (
            <Card
              key={collection.id}
              className="glass ai-card overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => handleFeaturedCollectionClick(collection)}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={collection.image_url}
                  alt={collection.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-semibold text-lg mb-1">{collection.title}</h3>
                    <p className="text-slate-300 text-sm">
                      {collection.description || `${collection.categories?.name || 'Collection'} prompts`}
                    </p>
                  </div>
                </div>
                <Badge className={`absolute top-4 right-4 ${getBadgeColorClass(collection.badge_color)}`}>
                  {collection.badge_text}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Explore Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Explore</h2>

        {/* Results - Scattered Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {(!allPrompts?.length && !prompts?.length && !isLoading) ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No prompts found matching your criteria.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search filters or check back later for new content.
              </p>
            </div>
          ) : (
            (allPrompts?.length > 0 ? allPrompts : prompts)?.map((prompt, index) => {
              // Create varied heights for scattered effect
              const heights = ['h-48', 'h-56', 'h-64', 'h-52', 'h-60', 'h-44'];
              const randomHeight = heights[index % heights.length];

              if (index === 0) console.log('Explore: Rendering first item', prompt.id);

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
                      {prompt.is_unlocked && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-black/70 backdrop-blur-sm text-emerald-200 border-white/30 shadow-md">Unlocked</Badge>
                        </div>
                      )}

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
                          className={`h-6 w-6 p-0 bg-purple-500/20 backdrop-blur-sm transition-all duration-300 ${prompt.is_favorited
                            ? 'hover:bg-purple-600/90'
                            : 'hover:bg-purple-500/80'
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(prompt);
                          }}
                        >
                          <Heart
                            className={`h-3 w-3 transition-all duration-300 ${prompt.is_favorited
                              ? 'text-purple-400 fill-purple-400 scale-110'
                              : 'text-white hover:text-purple-300'
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

          {/* Loading indicator for infinite scroll */}
          {isLoadingMore && (
            <div className="col-span-full text-center py-8">
              <div className="inline-flex items-center gap-2 text-purple-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                <span className="text-sm">Loading more prompts...</span>
              </div>
            </div>
          )}

          {/* End of results indicator */}
          {!hasMore && allPrompts.length > 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-slate-400 text-sm">You've reached the end of the results</p>
            </div>
          )}
        </div>
      </div>

      {/* PromptVault Modal */}
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
                  {selectedPrompt.is_unlocked && (
                    <Badge className="bg-black/70 backdrop-blur-sm text-emerald-200 border-white/30 shadow-md">Unlocked</Badge>
                  )}
                </div>
                {/* Category and badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {selectedPrompt.categories?.name || 'Uncategorized'}
                  </Badge>
                  <Badge variant="outline">
                    {selectedPrompt.media_type}
                  </Badge>
                  {selectedPrompt.model && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {selectedPrompt.model}
                    </Badge>
                  )}
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
                    Likes
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
                      <p className={`text-sm whitespace-pre-wrap ${selectedPrompt.is_unlocked ? '' : 'blur-sm select-none'}`}>
                        {selectedPrompt.prompt_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border/50">
                  {selectedPrompt.is_unlocked ? (
                    <>
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
                        className={`flex items-center gap-2 transition-all duration-300 ${selectedPrompt.is_favorited
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30'
                          : 'hover:bg-purple-500/10 border-purple-500/20'
                          }`}
                      >
                        <Heart
                          className={`h-4 w-4 transition-all duration-300 ${selectedPrompt.is_favorited
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
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleUnlockInModal(selectedPrompt)}
                        className="flex-1 ai-button"
                        disabled={isSpendingCredit}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {isSpendingCredit ? 'Unlocking...' : 'Unlock (1 credit)'}
                      </Button>
                      <Button
                        variant="outline"
                        disabled
                        className="flex items-center gap-2 opacity-60"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Prompt
                      </Button>
                    </>
                  )}
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
