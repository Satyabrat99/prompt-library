import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Users,
  FileText,
  Grid3X3,
  TrendingUp,
  Eye,
  Copy,
  Heart,
  PlusCircle,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalPrompts: number;
  totalCategories: number;
  totalUsers: number;
  totalViews: number;
  totalCopies: number;
  totalFavorites: number;
  recentPrompts: any[];
  popularCategories: any[];
  recentActivity: any[];
}

const AdminDashboard = () => {
  console.log('AdminDashboard mounting');

  // Fetch dashboard statistics
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Get total counts
      const [promptsResult, categoriesResult, usersResult, interactionsResult] = await Promise.all([
        supabase.from('prompts').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_interactions').select('interaction_type')
      ]);

      // Get recent prompts
      const { data: recentPrompts } = await supabase
        .from('prompts')
        .select(`
          *,
          categories (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get popular categories
      const { data: popularCategories } = await supabase
        .from('categories')
        .select(`
          *,
          prompts!inner(count)
        `)
        .order('name')
        .limit(5);

      // Calculate interaction totals
      const interactions = interactionsResult.data || [];
      const totalViews = interactions.filter(i => i.interaction_type === 'view').length;
      const totalCopies = interactions.filter(i => i.interaction_type === 'copy').length;
      const totalFavorites = interactions.filter(i => i.interaction_type === 'favorite').length;

      return {
        totalPrompts: promptsResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalViews,
        totalCopies,
        totalFavorites,
        recentPrompts: recentPrompts || [],
        popularCategories: popularCategories || [],
        recentActivity: interactions.slice(0, 10) || []
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load dashboard data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of platform activity and content management
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Button asChild className="h-20 flex-col gap-2">
          <Link to="/admin/prompts/new">
            <PlusCircle className="h-6 w-6" />
            Create New Prompt
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2">
          <Link to="/admin/categories">
            <Grid3X3 className="h-6 w-6" />
            Manage Categories
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2">
          <Link to="/admin/settings">
            <Settings className="h-6 w-6" />
            Platform Settings
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPrompts || 0}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCategories || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
            <p className="text-xs text-muted-foreground">
              All-time views
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copy Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalCopies || 0}</div>
            <p className="text-sm text-muted-foreground">Total copies</p>
            <Progress value={75} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              High engagement rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalFavorites || 0}</div>
            <p className="text-sm text-muted-foreground">Saved prompts</p>
            <Progress value={60} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Good user retention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">+12%</div>
            <p className="text-sm text-muted-foreground">This month</p>
            <Progress value={80} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Strong growth trend
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Prompts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Prompts</CardTitle>
            <CardDescription>
              Latest prompts added to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentPrompts?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No prompts yet
                </p>
              ) : (
                stats?.recentPrompts?.map((prompt) => (
                  <div key={prompt.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{prompt.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {prompt.categories?.name || 'Uncategorized'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {prompt.media_type}
                      </Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/prompt/${prompt.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button asChild className="w-full mt-4">
              <Link to="/admin/prompts">Manage All Prompts</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Popular Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Categories</CardTitle>
            <CardDescription>
              Categories with the most prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.popularCategories?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No categories yet
                </p>
              ) : (
                stats?.popularCategories?.map((category) => (
                  <div key={category.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {category.prompts?.length || 0} prompts
                      </Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/categories/${category.slug}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button asChild className="w-full mt-4">
              <Link to="/admin/categories">Manage Categories</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Platform Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Platform Health
          </CardTitle>
          <CardDescription>
            Overall system status and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">99.9%</div>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">2.1s</div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <p className="text-sm text-muted-foreground">Active Issues</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
