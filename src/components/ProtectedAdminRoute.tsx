import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useEffect, useState } from 'react';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, loading, profileLoading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  console.log('ProtectedAdminRoute state:', {
    user: user?.id,
    loading,
    profileLoading,
    timeoutReached
  });

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout reached in admin route');
        setTimeoutReached(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Fetch user profile to check role - only after auth is ready
  const { data: userProfile, isLoading: profileQueryLoading, error: profileError } = useQuery({
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
    enabled: !!user?.id && !loading && !profileLoading, // Wait for auth to be ready
    retry: 1, // Only retry once
    staleTime: 10 * 60 * 1000, // 10 minutes - user profile rarely changes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });

  console.log('ProtectedAdminRoute query state:', {
    profileQueryLoading,
    profileError,
    userProfile,
    role: userProfile?.role
  });

  // If loading for too long, redirect to auth
  if (loading && timeoutReached) {
    console.log('Auth loading timeout in admin route, showing retry');
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Connection is taking longer than expected...</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to auth
  if (!user) {
    console.log('No user in ProtectedAdminRoute, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Show loading while profile is being created/loaded
  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Show loading while profile query is running
  if (profileQueryLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If profile query failed, redirect to explore
  if (profileError) {
    console.warn('Profile query failed:', profileError);
    return <Navigate to="/explore" replace />;
  }

  // If not admin, redirect to explore
  if (userProfile?.role !== 'admin') {
    console.warn('User is not admin (role=' + userProfile?.role + '), redirecting to explore');
    return <Navigate to="/explore" replace />;
  }

  console.log('Access granted to admin route');
  return <>{children}</>;
};

export default ProtectedAdminRoute;
