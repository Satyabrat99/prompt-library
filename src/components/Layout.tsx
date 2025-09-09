import { ReactNode, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Home,
  Search,
  Grid3X3,
  Settings,
  LogOut,
  User,
  PlusCircle,
  BarChart3,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  Upload,
  Heart,
  Sparkles,
  Zap
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch user profile to check role
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userProfile?.role === 'admin';

  const handleNavigation = () => {
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed out',
      description: 'You have been successfully signed out.',
    });
    navigate('/auth');
  };

  // User navigation (for all users)
  const userNavigation = [
    { name: 'Explore', href: '/explore', icon: Search },
    { name: 'Categories', href: '/categories', icon: Grid3X3 },
    { name: 'Favorites', href: '/favorites', icon: Heart },
  ];

  // Admin navigation (only for admins)
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Home },
    { name: 'Upload Prompt', href: '/admin/upload', icon: Upload },
    { name: 'Create Prompt', href: '/admin/prompts/new', icon: PlusCircle },
    { name: 'Manage Categories', href: '/admin/categories', icon: Grid3X3 },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* AI Studio Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}
        fixed md:relative z-50 md:z-auto
        w-64 md:w-auto h-full md:h-auto
        flex flex-col transition-all duration-300 ease-in-out
        bg-sidebar/80 backdrop-blur-md md:bg-sidebar/80
        border-r border-border/50
      `}>
        <div className="flex flex-1 flex-col bg-sidebar">
          <div className="flex h-16 items-center px-6">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center glow">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-bold gradient-text">AI Studio</h1>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto h-8 w-8 p-0 hover:bg-white/10"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          
          <nav className="flex-1 space-y-1 px-4 py-4">
            {isAdmin ? (
              // Admin navigation
              <>
                {!sidebarCollapsed && (
                  <div className="mb-4">
                    <h3 className="px-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                      Admin Panel
                    </h3>
                  </div>
                )}
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleNavigation}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                      {!sidebarCollapsed && item.name}
                    </Link>
                  );
                })}
              </>
            ) : (
              // User navigation
              <>
                {!sidebarCollapsed && (
                  <div className="mb-4">
                    <h3 className="px-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                      Browse
                    </h3>
                  </div>
                )}
                {userNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleNavigation}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                      {!sidebarCollapsed && item.name}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
          
          <div className="flex-shrink-0 p-4">
            <Link
              to="/settings"
              onClick={handleNavigation}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              title={sidebarCollapsed ? 'Settings' : undefined}
            >
              <Settings className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
              {!sidebarCollapsed && 'Settings'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-background/80 backdrop-blur-md border-b border-border/50 relative z-10">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-8 w-8 p-0 hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                {isAdmin 
                  ? adminNavigation.find(item => item.href === location.pathname)?.name || 'Admin Panel'
                  : userNavigation.find(item => item.href === location.pathname)?.name || 'AI Studio'
                }
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-background/50 backdrop-blur-sm p-6 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;