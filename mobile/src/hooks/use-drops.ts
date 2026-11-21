
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DropsResponse } from '@/types/drop';

export function useDrops(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['drops', limit, offset],
    queryFn: async () => {
      const response = await api.get<DropsResponse>('/drops', {
        params: { limit, offset },
      });
      return response.data;
    },
    staleTime: 30_000,
  });
}
