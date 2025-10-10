import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PromptRow = {
  id: string;
  title: string;
  primary_image_url: string | null;
  created_at: string;
};

const Content = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [page, setPage] = useState(0);
  const [allPrompts, setAllPrompts] = useState<PromptRow[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selected, setSelected] = useState<PromptRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ITEMS_PER_PAGE = 24;

  const { data: prompts, isLoading } = useQuery({
    queryKey: ['admin-content', timeFilter, page],
    queryFn: async () => {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('prompts')
        .select('id,title,primary_image_url,created_at')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (timeFilter !== 'all') {
        const now = new Date();
        const since = new Date(
          timeFilter === '24h' ? now.getTime() - 24*60*60*1000
          : timeFilter === '7d' ? now.getTime() - 7*24*60*60*1000
          : now.getTime() - 30*24*60*60*1000
        ).toISOString();
        query = query.gte('created_at', since);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PromptRow[];
    },
  });

  useEffect(() => {
    if (prompts) {
      if (page === 0) {
        setAllPrompts(prompts);
      } else {
        setAllPrompts(prev => [...prev, ...prompts]);
      }
      setHasMore(prompts.length === ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }
  }, [prompts, page]);

  useEffect(() => {
    setPage(0);
    setAllPrompts([]);
    setHasMore(true);
  }, [timeFilter]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 800) {
        loadMore();
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  const deleteMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const { error } = await supabase.from('prompts').delete().eq('id', promptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Content removed successfully.' });
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
    },
    onError: (e: any) => {
      toast({ title: 'Delete failed', description: e.message || 'Please try again.', variant: 'destructive' });
    },
  });

  const confirmDelete = (row: PromptRow) => {
    setSelected(row);
    setIsModalOpen(true);
  };

  const onDelete = async () => {
    if (!selected) return;
    await deleteMutation.mutateAsync(selected.id);
    setIsModalOpen(false);
    setSelected(null);
  };

  const imgOrPlaceholder = (url: string | null) => url || '/placeholder.svg';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-400" />
          <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
            <SelectTrigger className="w-40 h-9 bg-background/50 border-purple-500/20 focus:border-purple-500/50 rounded-full">
              <SelectValue placeholder="Uploaded" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {allPrompts.map((p) => (
          <div key={p.id} className="break-inside-avoid mb-4 group">
            <Card className="overflow-hidden ai-card glass">
              <div className="relative overflow-hidden bg-black/10">
                <img
                  src={imgOrPlaceholder(p.primary_image_url)}
                  alt={p.title}
                  className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-semibold text-sm line-clamp-1">{p.title}</h3>
                    <p className="text-white/60 text-xs">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => confirmDelete(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ))}

        {isLoadingMore && (
          <div className="col-span-full text-center py-8">
            <div className="inline-flex items-center gap-2 text-purple-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
              <span className="text-sm">Loading more...</span>
            </div>
          </div>
        )}
      </div>

      {!hasMore && allPrompts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">You've reached the end</p>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Confirm delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the content from the database. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Content;


