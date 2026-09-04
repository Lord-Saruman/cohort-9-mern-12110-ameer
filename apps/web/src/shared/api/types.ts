export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiFieldError[];
  requestId?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorPayload;
}
