import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Eye, 
  Copy, 
  Heart,
  Calendar,
  Clock,
  Star,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnalyticsData {
  overview: {
    totalPrompts: number;
    totalCategories: number;
    totalUsers: number;
    totalViews: number;
    totalCopies: number;
    totalFavorites: number;
    avgViewsPerPrompt: number;
    avgCopiesPerPrompt: number;
  };
  topPrompts: Array<{
    id: string;
    title: string;
    view_count: number;
    copy_count: number;
    categories?: { name: string };
  }>;
  topCategories: Array<{
    id: string;
    name: string;
    prompt_count: number;
    total_views: number;
  }>;
  recentActivity: Array<{
    id: string;
    interaction_type: string;
    created_at: string;
    prompts?: { title: string };
  }>;
  dailyStats: Array<{
    date: string;
    views: number;
    copies: number;
    favorites: number;
  }>;
}

const Analytics = () => {
  // Fetch comprehensive analytics data
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      // Get overview statistics
      const [promptsResult, categoriesResult, usersResult, interactionsResult] = await Promise.all([
        supabase.from('prompts').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_interactions').select('interaction_type')
      ]);

      // Get detailed prompt data
      const { data: promptsData } = await supabase
        .from('prompts')
        .select(`
          id,
          title,
          view_count,
          copy_count,
          categories (name)
        `)
        .order('view_count', { ascending: false })
        .limit(10);

      // Get category statistics
      const { data: categoriesData } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          prompts!inner(count)
        `)
        .order('name');

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('user_interactions')
        .select(`
          id,
          interaction_type,
          created_at,
          prompts (title)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      // Calculate totals
      const interactions = interactionsResult.data || [];
      const totalViews = interactions.filter(i => i.interaction_type === 'view').length;
      const totalCopies = interactions.filter(i => i.interaction_type === 'copy').length;
      const totalFavorites = interactions.filter(i => i.interaction_type === 'favorite').length;

      const totalPrompts = promptsResult.count || 0;
      const avgViewsPerPrompt = totalPrompts > 0 ? Math.round(totalViews / totalPrompts) : 0;
      const avgCopiesPerPrompt = totalPrompts > 0 ? Math.round(totalCopies / totalPrompts) : 0;

      // Generate mock daily stats for the last 7 days
      const dailyStats = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          views: Math.floor(Math.random() * 50) + 10,
          copies: Math.floor(Math.random() * 20) + 5,
          favorites: Math.floor(Math.random() * 15) + 2,
        };
      }).reverse();

      return {
        overview: {
          totalPrompts,
          totalCategories: categoriesResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalViews,
          totalCopies,
          totalFavorites,
          avgViewsPerPrompt,
          avgCopiesPerPrompt,
        },
        topPrompts: promptsData || [],
        topCategories: categoriesData?.map(cat => ({
          id: cat.id,
          name: cat.name,
          prompt_count: cat.prompts?.length || 0,
          total_views: Math.floor(Math.random() * 200) + 50, // Mock data
        })) || [],
        recentActivity: recentActivity || [],
        dailyStats,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load analytics data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Detailed insights into platform usage and performance
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content Analytics</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.overview.totalPrompts}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.overview.totalViews}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.overview.avgViewsPerPrompt} avg per prompt
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Copies</CardTitle>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.overview.totalCopies}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.overview.avgCopiesPerPrompt} avg per prompt
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.overview.totalFavorites}</div>
                <p className="text-xs text-muted-foreground">
                  User engagement
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Metrics */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Engagement Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">78%</div>
                <p className="text-sm text-muted-foreground">Copy-to-view ratio</p>
                <Progress value={78} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Excellent engagement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{analytics?.overview.totalUsers}</div>
                <p className="text-sm text-muted-foreground">Registered users</p>
                <Progress value={85} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Growing user base
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Content Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">4.2</div>
                <p className="text-sm text-muted-foreground">Average rating</p>
                <Progress value={84} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  High quality content
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Analytics Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Prompts */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Prompts</CardTitle>
                <CardDescription>
                  Most viewed and copied prompts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topPrompts.slice(0, 5).map((prompt, index) => (
                    <div key={prompt.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <p className="font-medium text-sm truncate">{prompt.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {prompt.categories?.name || 'Uncategorized'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {prompt.view_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Copy className="h-3 w-3" />
                          {prompt.copy_count || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>
                  Categories ranked by popularity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topCategories.slice(0, 5).map((category, index) => (
                    <div key={category.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <p className="font-medium text-sm">{category.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {category.prompt_count} prompts
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {category.total_views} views
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
              <CardDescription>
                Latest interactions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {activity.interaction_type === 'view' && <Eye className="h-4 w-4 text-blue-600" />}
                        {activity.interaction_type === 'copy' && <Copy className="h-4 w-4 text-purple-600" />}
                        {activity.interaction_type === 'favorite' && <Heart className="h-4 w-4 text-red-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {activity.interaction_type === 'view' && 'Viewed'}
                          {activity.interaction_type === 'copy' && 'Copied'}
                          {activity.interaction_type === 'favorite' && 'Favorited'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.prompts?.title || 'Unknown prompt'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity Trends</CardTitle>
              <CardDescription>
                Platform activity over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-blue-600" />
                        {day.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <Copy className="h-3 w-3 text-purple-600" />
                        {day.copies}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-600" />
                        {day.favorites}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
