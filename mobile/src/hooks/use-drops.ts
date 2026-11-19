
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DropsResponse } from '@/types/drop';
import axios from 'axios';

export function useDrops(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['drops', limit, offset],
    queryFn: async () => {
  try {
    console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);

    const response = await api.get<DropsResponse>('/drops', {
      params: { limit, offset },
    });

    console.log('DROPS RESPONSE:', response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('API ERROR:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
    }

    throw error;
  }
},
    staleTime: 30_000,
  });
}
