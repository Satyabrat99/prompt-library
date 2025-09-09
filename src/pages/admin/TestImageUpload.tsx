import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const TestImageUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      console.log('Uploading file:', file.name, 'to path:', filePath);

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('prompt-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('prompt-images')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', urlData.publicUrl);
      setUploadedUrl(urlData.publicUrl);

      toast({
        title: 'Upload successful!',
        description: 'Image has been uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const testImageUrl = () => {
    if (!testUrl) return;
    
    const publicUrl = supabase.storage.from('prompt-images').getPublicUrl(testUrl).data.publicUrl;
    console.log('Testing URL:', testUrl, '-> Generated:', publicUrl);
    
    // Create a test image element
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully:', publicUrl);
      toast({
        title: 'Image test successful!',
        description: 'Image URL is working correctly.',
      });
    };
    img.onerror = () => {
      console.error('Image failed to load:', publicUrl);
      toast({
        title: 'Image test failed',
        description: 'Image URL is not accessible.',
        variant: 'destructive',
      });
    };
    img.src = publicUrl;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Upload Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Select Image File</Label>
            <Input
              id="file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-2"
            />
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </Button>

          {uploadedUrl && (
            <div className="space-y-2">
              <Label>Uploaded Image URL:</Label>
              <p className="text-sm text-muted-foreground break-all">{uploadedUrl}</p>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={uploadedUrl}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                  onLoad={() => console.log('Uploaded image loaded successfully')}
                  onError={(e) => console.error('Uploaded image failed to load:', e)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Image URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testUrl">Image Path (e.g., uploads/filename.jpg)</Label>
            <Input
              id="testUrl"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="uploads/1234567890-abc123.jpg"
              className="mt-2"
            />
          </div>
          
          <Button 
            onClick={testImageUrl} 
            disabled={!testUrl}
            className="w-full"
          >
            Test Image URL
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestImageUpload;
