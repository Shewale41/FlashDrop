import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Drop } from '@/types/drop';

type UpcomingDropsResponse = { data: Drop[] };

export function useUpcomingDrops() {
  return useQuery({
    queryKey: ['drops', 'upcoming'],
    queryFn: async () => {
      const response = await api.get<UpcomingDropsResponse>('/drops/upcoming');
      return response.data.data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
