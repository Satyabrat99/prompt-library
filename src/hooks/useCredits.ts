import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type CreditsRow = {
  credits_remaining: number;
  daily_quota: number;
  credit_date: string;
};

type SpendResponse = { success: boolean; credits_left: number | null };

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const creditsQuery = useQuery({
    queryKey: ["credits", user?.id],
    queryFn: async (): Promise<CreditsRow | null> => {
      if (!user?.id) return null;
      
      try {
        const { data, error } = await supabase
          .from("user_credits")
          .select("credits_remaining, daily_quota, credit_date")
          .eq("user_id", user.id)
          .eq("credit_date", new Date().toISOString().split('T')[0]) // Today's date
          .single();
          
        if (error) {
          console.warn('Credits query error:', error);
          // If no credits record exists, try to initialize
          if (error.code === 'PGRST116') {
            console.log('No credits record found, initializing...');
            try {
              const { error: initError } = await supabase.rpc('initialize_user_credits', {
                target_user_id: user.id
              });
              if (initError) {
                console.warn('Failed to initialize credits:', initError);
                return null;
              }
              // Retry the query after initialization
              const { data: retryData, error: retryError } = await supabase
                .from("user_credits")
                .select("credits_remaining, daily_quota, credit_date")
                .eq("user_id", user.id)
                .eq("credit_date", new Date().toISOString().split('T')[0])
                .single();
              if (retryError) {
                console.warn('Retry credits query error:', retryError);
                return null;
              }
              return retryData as CreditsRow;
            } catch (initErr) {
              console.warn('Exception during credits initialization:', initErr);
              return null;
            }
          }
          return null;
        }
        return data as CreditsRow;
      } catch (err) {
        console.warn('Exception in credits query:', err);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - credits don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    retry: 1,
  });

  const spendMutation = useMutation({
    mutationFn: async (promptId: string): Promise<SpendResponse> => {
      try {
        console.log('Spending credit for prompt:', promptId);
        const { data, error } = await supabase.rpc("spend_prompt_credit", {
          in_prompt_id: promptId,
        });
        
        if (error) {
          console.error('Spend credit RPC error:', error);
          throw error;
        }
        
        console.log('Spend credit RPC response:', data);
        const row = data && data[0];
        const result = (row as SpendResponse) || { success: false, credits_left: null };
        console.log('Parsed result:', result);
        return result;
      } catch (err) {
        console.error('Exception in spend credit:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('Credit spent successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["credits", user?.id] });
    },
    onError: (error) => {
      console.error('Credit spend mutation error:', error);
    },
  });

  return {
    credits: creditsQuery.data,
    isLoadingCredits: creditsQuery.isLoading,
    spendPromptCredit: spendMutation.mutateAsync,
    isSpendingCredit: spendMutation.isPending,
  };
}


