
export interface Drop {
  id: string;
  name: string;
  available_inventory: number;
}

export interface DropsResponse {
  data: Drop[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
