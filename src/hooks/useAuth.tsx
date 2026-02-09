import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  role: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Helper to check/create profile
    const checkOrCreateProfile = async (user: User) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          console.log('No user profile found, creating one...');
          const username = user.email?.split('@')[0] || 'user';
          const fullName = user.user_metadata?.full_name || username;

          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              username: username,
              full_name: fullName,
              role: 'user'
            });

          if (createError) console.warn('Failed to create user profile:', createError);
        }
      } catch (e) {
        console.warn('Exception checking profile:', e);
      }
    };

    const initializeAuth = async () => {
      // Safety valve: Force loading to false after 8 seconds max
      const safetyTimer = setTimeout(() => {
        if (isMounted) {
          console.warn('Auth initialization safety timer triggered');
          setLoading(false);
          setAuthInitialized(true);
        }
      }, 8000);

      try {
        console.log('Initializing auth...');

        // Step 1: Set up auth state listener first to catch all events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;

            console.log('Auth state change:', event, session?.user?.id);

            // Handle different auth events
            if (event === 'SIGNED_OUT') {
              console.log('User signed out, clearing state');
              setSession(null);
              setUser(null);
              setRole(null);
              setProfileLoading(false);
            } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
              setSession(session);
              setUser(session?.user ?? null);

              if (session?.user) {
                // If it's a new sign in (not just initialization), show loading
                if (event === 'SIGNED_IN') {
                  setProfileLoading(true);
                }

                // Fetch user role - independent promise
                supabase
                  .from('user_profiles')
                  .select('role')
                  .eq('id', session.user.id)
                  .single()
                  .then(({ data }) => {
                    if (isMounted && data) setRole(data.role);
                  })
                  .catch(err => console.warn('Error fetching role:', err))
                  .finally(() => {
                    if (isMounted && event === 'SIGNED_IN') setProfileLoading(false);
                  });

                // Check/Create profile logic (background)
                if (event === 'SIGNED_IN') {
                  checkOrCreateProfile(session.user);
                }
              }
            }

            // On the very first event (or initial session load), stop loading
            setLoading(false);
            setAuthInitialized(true);
            clearTimeout(safetyTimer);
          }
        );

        // Step 2: Get initial session manually to fire the listener immediately if needed
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Error getting session:', error);
          if (isMounted) setLoading(false);
        }

        // Return cleanup
        return subscription;

      } catch (error) {
        console.error('Exception during auth initialization:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    let authSubscription: { unsubscribe: () => void } | undefined;

    initializeAuth().then((sub) => {
      if (isMounted) authSubscription = sub;
    });

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);



  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If signin was successful, check if user has a profile
    if (data.user && !error) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        // If no profile exists, create one
        if (profileError && profileError.code === 'PGRST116') {
          console.log('No user profile found, creating one...');

          const username = data.user.email?.split('@')[0] || 'user';
          const fullName = data.user.user_metadata?.full_name || username;

          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              username: username,
              full_name: fullName,
              role: 'user'
            });

          if (createError) {
            console.warn('Failed to create user profile during signin:', createError);
          } else {
            console.log('User profile created during signin');
          }
        }
      } catch (profileError) {
        console.warn('Exception checking/creating user profile during signin:', profileError);
      }
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      // Try signup without any metadata that might trigger database issues
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          // Remove data that might cause trigger issues
        },
      });

      if (error) {
        console.error('Signup error:', error);

        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message?.includes('Database error saving new user')) {
          errorMessage = 'There was an issue creating your profile. Please try again or contact support.';
        } else if (error.message?.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message?.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }

        return { error: { ...error, message: errorMessage }, data: null };
      }

      // If signup was successful, try to create user profile manually
      if (data.user) {
        try {
          const username = fullName ? fullName.toLowerCase().replace(/\s+/g, '_') : email.split('@')[0];

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              username: username,
              full_name: fullName || email.split('@')[0],
              role: 'user'
            });

          if (profileError) {
            console.warn('Failed to create user profile:', profileError);
            // Don't fail the signup if profile creation fails
          } else {
            console.log('User profile created successfully');
          }
        } catch (profileError) {
          console.warn('Exception creating user profile:', profileError);
          // Don't fail the signup
        }
      }

      console.log('Signup successful:', data);
      return { error: null, data };
    } catch (error) {
      console.error('Signup exception:', error);
      return { error: { message: 'An unexpected error occurred during signup. Please try again.' }, data: null };
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting signout process...');

      // Clear local state immediately to prevent race conditions
      setSession(null);
      setUser(null);
      setRole(null);
      setProfileLoading(false);

      // Clear localStorage first
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      localStorage.removeItem(`sb-${projectId}-auth-token`);

      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.warn('Signout error:', error);
        // Even if signout fails, we've already cleared local state
        // This handles cases where the session is invalid/expired
      } else {
        console.log('Signout successful');
      }

    } catch (error) {
      console.error('Signout exception:', error);
      // Even if there's an exception, local state is already cleared
    }
  };

  const value = {
    user,
    session,
    loading,
    profileLoading,
    role,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}