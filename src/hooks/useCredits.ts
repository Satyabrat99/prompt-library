import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type CreditsRow = {
  credits_remaining: number;
  monthly_quota: number;
  period_year: number;
  period_month: number;
};

type SpendResponse = { success: boolean; credits_left: number | null };

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const creditsQuery = useQuery({
    queryKey: ["credits", user?.id],
    queryFn: async (): Promise<CreditsRow | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining, monthly_quota, period_year, period_month")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as CreditsRow;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const spendMutation = useMutation({
    mutationFn: async (promptId: string): Promise<SpendResponse> => {
      const { data, error } = await (supabase as any).rpc("spend_prompt_credit", {
        in_prompt_id: promptId,
      });
      if (error) throw error;
      const row = data && data[0];
      return (row as SpendResponse) || { success: false, credits_left: null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credits", user?.id] });
    },
  });

  return {
    credits: creditsQuery.data,
    isLoadingCredits: creditsQuery.isLoading,
    spendPromptCredit: spendMutation.mutateAsync,
    isSpendingCredit: spendMutation.isPending,
  };
}


