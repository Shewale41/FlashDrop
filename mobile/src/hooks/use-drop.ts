import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Drop } from '@/types/drop';

export function useDrop(id: string) {
  return useQuery({
    queryKey: ['drop', id],
    queryFn: async () => {
      const response = await api.get<Drop>(`/drops/${encodeURIComponent(id)}`);
      return response.data;
    },
    enabled: id.length > 0,
    staleTime: 30_000,
  });
}
