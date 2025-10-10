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
import { useCredits } from '../hooks/useCredits';

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

  const { toast } = useToast();
  const { credits, isLoadingCredits } = useCredits();
  
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
    { name: 'Content', href: '/admin/content', icon: FileText },
    { name: 'Manage Categories', href: '/admin/categories', icon: Grid3X3 },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-transparent relative overflow-hidden">
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
        bg-white/5 backdrop-blur-xl md:bg-white/5
        border-r border-white/20
        relative overflow-hidden
      `}>
        {/* Frozen Ice Crystals Effect */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-300/40 rounded-full blur-sm animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400/50 rounded-full blur-sm animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-purple-300/30 rounded-full blur-sm animate-pulse delay-2000"></div>
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-purple-400/40 rounded-full blur-sm animate-pulse delay-500"></div>
          <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-purple-300/35 rounded-full blur-sm animate-pulse delay-1500"></div>
        </div>
        
        {/* Subtle Texture Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/8 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(147,51,234,0.12)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.08)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.06)_0%,transparent_70%)]"></div>
        </div>
        
        <div className="flex flex-1 flex-col bg-transparent relative z-10">
          <div className="flex h-16 items-center px-6">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center glow">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-bold gradient-text">Prompt Studio</h1>
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
                    <h3 className="px-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
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
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                        isActive
                          ? 'bg-white/20 text-white border border-white/20 shadow-lg shadow-purple-500/10'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white hover:border hover:border-white/10'
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
                    <h3 className="px-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
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
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                        isActive
                          ? 'bg-white/20 text-white border border-white/20 shadow-lg shadow-purple-500/10'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white hover:border hover:border-white/10'
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
          
          <div className="flex-shrink-0 p-4 space-y-2">
            {/* Credits indicator - hidden when collapsed */}
            {!sidebarCollapsed && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-300 px-2 py-1 rounded-md bg-white/5 border border-white/10 mb-2 w-auto">
                <span className="opacity-80">Credits</span>
                <span className="font-medium tabular-nums">
                  {isLoadingCredits ? '...' : `${credits?.credits_remaining ?? '-'}/${credits?.monthly_quota ?? '-'}`}
                </span>
              </div>
            )}
            {/* Avatar Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                    sidebarCollapsed 
                      ? 'h-10 w-10 p-0 mx-auto justify-center' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white hover:border hover:border-white/10'
                  }`}
                  title={sidebarCollapsed ? 'Profile' : undefined}
                >
                  <Avatar className={`${sidebarCollapsed ? 'mx-auto h-5 w-5' : 'mr-3 h-6 w-6'}`}>
                    <AvatarFallback className={`${sidebarCollapsed ? 'text-xs' : 'text-sm'}`}>
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <span className="truncate">{user?.email?.split('@')[0] || 'User'}</span>
                  )}
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
            
            {/* Settings Button */}
            <Link
              to="/settings"
              onClick={handleNavigation}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                location.pathname === '/settings'
                  ? 'bg-white/20 text-white border border-white/20 shadow-lg shadow-purple-500/10'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white hover:border hover:border-white/10'
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

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-white/2 backdrop-blur-sm p-6 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;