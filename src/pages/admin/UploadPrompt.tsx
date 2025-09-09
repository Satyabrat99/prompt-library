import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Upload, 
  X, 
  Plus, 
  Save, 
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Eye,
  Check
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;

const UploadPrompt = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Form state - simplified for image-focused uploads
  const [formData, setFormData] = useState({
    title: '',
    prompt_text: '',
    description: '',
    category_id: '',
    media_type: 'image' as const,
    difficulty_level: 'beginner' as const,
    style_tags: [] as string[],
    industry_tags: [] as string[],
    image_url: '',
  });

  const [newStyleTag, setNewStyleTag] = useState('');
  const [newIndustryTag, setNewIndustryTag] = useState('');

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: async (promptData: typeof formData) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Creating prompt with data:', promptData);

      const { error } = await supabase
        .from('prompts')
        .insert({
          title: promptData.title,
          prompt_text: promptData.prompt_text,
          ...(formData.category_id && formData.category_id !== 'no-category' && { category_id: formData.category_id }),
          media_type: promptData.media_type,
          difficulty_level: promptData.difficulty_level,
          style_tags: promptData.style_tags,
          industry_tags: promptData.industry_tags,
          primary_image_url: promptData.image_url || null,
          created_by: user.id,
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast({
        title: 'Prompt uploaded!',
        description: 'Your prompt with image has been successfully added to the library.',
      });
      // Reset form after successful upload
      setFormData({
        title: '',
        prompt_text: '',
        description: '',
        category_id: '',
        media_type: 'image',
        difficulty_level: 'beginner',
        style_tags: [],
        industry_tags: [],
        image_url: '',
      });
      setUploadedImage(null);
      setNewStyleTag('');
      setNewIndustryTag('');
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Submitting form with data:', formData);
      await createPromptMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (url: string) => {
    setUploadedImage(url);
    handleInputChange('image_url', url);
  };

  const addStyleTag = () => {
    if (newStyleTag.trim() && !formData.style_tags.includes(newStyleTag.trim())) {
      setFormData(prev => ({
        ...prev,
        style_tags: [...prev.style_tags, newStyleTag.trim()]
      }));
      setNewStyleTag('');
    }
  };

  const removeStyleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      style_tags: prev.style_tags.filter(t => t !== tag)
    }));
  };

  const addIndustryTag = () => {
    if (newIndustryTag.trim() && !formData.industry_tags.includes(newIndustryTag.trim())) {
      setFormData(prev => ({
        ...prev,
        industry_tags: [...prev.industry_tags, newIndustryTag.trim()]
      }));
      setNewIndustryTag('');
    }
  };

  const removeIndustryTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      industry_tags: prev.industry_tags.filter(t => t !== tag)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Prompt</h1>
          <p className="text-muted-foreground">
            Upload an image with its prompt for the explore page
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Upload Image
                </CardTitle>
                <CardDescription>
                  Upload the main image that will appear in the explore page cards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ImageUpload
                  label="Prompt Image"
                  description="Upload the main showcase image for your prompt"
                  onImageUploaded={handleImageUpload}
                  currentImageUrl={formData.image_url}
                />

                {/* Image Preview */}
                {uploadedImage && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="relative h-48 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={uploadedImage}
                        alt="Uploaded preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-green-500 text-white">
                          <Check className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This is how your image will appear in the explore page cards
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Prompt Information
                </CardTitle>
                <CardDescription>
                  Provide the prompt details that go with this image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter a descriptive title for your prompt"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt_text">Prompt Text *</Label>
                  <Textarea
                    id="prompt_text"
                    value={formData.prompt_text}
                    onChange={(e) => handleInputChange('prompt_text', e.target.value)}
                    placeholder="Enter the full prompt text..."
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description explaining the prompt or its use case..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-category">No Category</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty_level">Difficulty Level</Label>
                    <Select value={formData.difficulty_level} onValueChange={(value) => handleInputChange('difficulty_level', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Add tags to help users discover your prompt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Style Tags */}
                <div className="space-y-3">
                  <Label>Style Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newStyleTag}
                      onChange={(e) => setNewStyleTag(e.target.value)}
                      placeholder="Add style tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStyleTag())}
                    />
                    <Button type="button" onClick={addStyleTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.style_tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeStyleTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Industry Tags */}
                <div className="space-y-3">
                  <Label>Industry Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newIndustryTag}
                      onChange={(e) => setNewIndustryTag(e.target.value)}
                      placeholder="Add industry tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIndustryTag())}
                    />
                    <Button type="button" onClick={addIndustryTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.industry_tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeIndustryTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Explore Page Preview
                </CardTitle>
                <CardDescription>
                  How your prompt will appear in the scattered cards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formData.image_url ? (
                    <div className="relative h-32 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={formData.image_url}
                        alt={formData.title || 'Preview'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                        <div className="absolute bottom-2 left-2 right-2">
                          <h4 className="text-white font-semibold text-sm line-clamp-1">
                            {formData.title || 'Untitled Prompt'}
                          </h4>
                          <p className="text-white/80 text-xs line-clamp-2">
                            {formData.prompt_text || 'No prompt text yet...'}
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-white/90">
                          {categories?.find(c => c.id === formData.category_id)?.name || 'Uncategorized'}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge 
                          variant={formData.difficulty_level === 'beginner' ? 'default' : 
                                 formData.difficulty_level === 'intermediate' ? 'secondary' : 'destructive'}
                          className="text-xs bg-white/90"
                        >
                          {formData.difficulty_level}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 rounded-lg bg-muted flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Upload an image to see preview</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1">
                    {formData.style_tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {formData.style_tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{formData.style_tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full" disabled={isLoading || !formData.image_url}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isLoading ? 'Uploading...' : 'Upload Prompt'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/admin/dashboard')}>
                  Cancel
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Upload high-quality images for best results</p>
                <p>• Use descriptive titles for better discoverability</p>
                <p>• Add relevant tags to help users find your prompt</p>
                <p>• Images will appear in the explore page scattered grid</p>
                <p>• Choose appropriate difficulty level</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UploadPrompt;
