import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type FeaturedCollection = Tables<'featured_collections'> & {
  categories?: { name: string };
};

type Category = Tables<'categories'>;

const FeaturedCollectionsManagement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<FeaturedCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    redirect_category_id: '',
    display_order: 0,
    is_active: true,
    badge_text: 'Featured',
    badge_color: 'purple',
  });

  // Fetch featured collections with category names
  const { data: collections, isLoading: collectionsLoading, error } = useQuery({
    queryKey: ['admin-featured-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_collections')
        .select(`
          *,
          categories:categories!featured_collections_redirect_category_id_fkey (name)
        `)
        .order('display_order');

      if (error) throw error;
      return data as FeaturedCollection[];
    },
  });

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data as Category[];
    },
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('featured_collections')
        .insert([{
          title: data.title,
          description: data.description || null,
          image_url: data.image_url,
          redirect_category_id: data.redirect_category_id || null,
          display_order: data.display_order,
          is_active: data.is_active,
          badge_text: data.badge_text,
          badge_color: data.badge_color,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-collections'] });
      toast({
        title: 'Success',
        description: 'Featured collection created successfully.',
      });
      setIsCreateOpen(false);
      resetForm();
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create featured collection.',
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      console.log('Updating collection:', { id, data });

      try {
        const { data: result, error } = await supabase
          .from('featured_collections')
          .update({
            title: data.title,
            description: data.description || null,
            image_url: data.image_url,
            redirect_category_id: data.redirect_category_id || null,
            display_order: data.display_order,
            is_active: data.is_active,
            badge_text: data.badge_text,
            badge_color: data.badge_color,
          })
          .eq('id', id)
          .select();

        console.log('Update result:', { result, error });

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        console.log('Update successful');
        return result;
      } catch (err) {
        console.error('Update exception:', err);
        throw err;
      }
    },
    onSuccess: (result) => {
      console.log('Update mutation success:', result);
      queryClient.invalidateQueries({ queryKey: ['admin-featured-collections'] });
      toast({
        title: 'Success',
        description: 'Featured collection updated successfully.',
      });
      setIsEditOpen(false);
      setEditingCollection(null);
      resetForm();
      setIsLoading(false);
    },
    onError: (error: any) => {
      console.error('Update mutation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update featured collection.',
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('featured_collections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-collections'] });
      toast({
        title: 'Success',
        description: 'Featured collection deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete featured collection.',
        variant: 'destructive',
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('featured_collections')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-collections'] });
      toast({
        title: 'Success',
        description: 'Featured collection status updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      redirect_category_id: '',
      display_order: 0,
      is_active: true,
      badge_text: 'Featured',
      badge_color: 'purple',
    });
  };

  const handleCreate = () => {
    setIsCreateOpen(true);
    resetForm();
  };

  const handleEdit = (collection: FeaturedCollection) => {
    setEditingCollection(collection);
    setFormData({
      title: collection.title,
      description: collection.description || '',
      image_url: collection.image_url,
      redirect_category_id: collection.redirect_category_id || '',
      display_order: collection.display_order,
      is_active: collection.is_active,
      badge_text: collection.badge_text,
      badge_color: collection.badge_color,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submitted:', { editingCollection, formData });

    // Basic validation
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.image_url.trim()) {
      toast({
        title: 'Error',
        description: 'Image URL is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Add timeout to prevent stuck loading state
    const timeoutId = setTimeout(() => {
      console.warn('Mutation timeout - resetting loading state');
      setIsLoading(false);
      toast({
        title: 'Timeout',
        description: 'The operation is taking longer than expected. Please try again.',
        variant: 'destructive',
      });
    }, 10000); // 10 second timeout

    if (editingCollection) {
      console.log('Calling update mutation');
      updateCollectionMutation.mutate({
        id: editingCollection.id,
        data: formData,
      }, {
        onSettled: () => {
          clearTimeout(timeoutId);
        }
      });
    } else {
      console.log('Calling create mutation');
      createCollectionMutation.mutate(formData, {
        onSettled: () => {
          clearTimeout(timeoutId);
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this featured collection?')) {
      deleteCollectionMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id, is_active: !currentStatus });
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

  if (collectionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading featured collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load featured collections.</p>
        <pre className="text-xs text-left mt-2 bg-slate-100 p-2 rounded text-red-500 overflow-auto max-w-lg mx-auto">
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Featured Collections</h1>
          <p className="text-muted-foreground">
            Manage featured collections displayed on the explore page
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Featured Collection
        </Button>
      </div>

      {/* Collections Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections?.map((collection) => (
          <Card key={collection.id} className="overflow-hidden">
            <div className="relative h-48 overflow-hidden">
              <img
                src={collection.image_url}
                alt={collection.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              <div className="absolute top-4 right-4">
                <Badge className={getBadgeColorClass(collection.badge_color)}>
                  {collection.badge_text}
                </Badge>
              </div>
              <div className="absolute top-4 left-4">
                <Badge variant={collection.is_active ? 'default' : 'secondary'}>
                  {collection.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <CardTitle className="text-lg mb-2">{collection.title}</CardTitle>
              <CardDescription className="mb-3">
                {collection.description || 'No description'}
              </CardDescription>
              <div className="text-sm text-muted-foreground mb-4">
                Redirects to: {collection.categories?.name || 'No category selected'}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(collection.id, collection.is_active)}
                  >
                    {collection.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(collection)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(collection.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Order: {collection.display_order}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingCollection(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? 'Edit Featured Collection' : 'Create Featured Collection'}
            </DialogTitle>
            <DialogDescription>
              {editingCollection
                ? 'Update the featured collection details below.'
                : 'Create a new featured collection to display on the explore page.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Collection title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Collection description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL *</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect_category">Redirect to Category</Label>
              <Select
                value={formData.redirect_category_id}
                onValueChange={(value) => setFormData({ ...formData, redirect_category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge_text">Badge Text</Label>
                <Input
                  id="badge_text"
                  value={formData.badge_text}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                  placeholder="Featured"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge_color">Badge Color</Label>
                <Select
                  value={formData.badge_color}
                  onValueChange={(value) => setFormData({ ...formData, badge_color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setEditingCollection(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || updateCollectionMutation.isPending || createCollectionMutation.isPending}>
                {isLoading || updateCollectionMutation.isPending || createCollectionMutation.isPending
                  ? 'Saving...'
                  : editingCollection ? 'Update' : 'Create'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeaturedCollectionsManagement;
