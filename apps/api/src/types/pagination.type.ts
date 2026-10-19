type PaginationQueryType = {
  page: number;
  limit: number;
};

type PaginationOptionsType = {
  limit: number;
  offset: number;
};

type PaginationMetaType = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type { PaginationQueryType, PaginationOptionsType, PaginationMetaType };
