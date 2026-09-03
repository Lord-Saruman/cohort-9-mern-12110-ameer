import type { ApiErrorEnvelope, ApiFieldError, ApiSuccessResponse } from './types';

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ApiFieldError[];
  readonly requestId?: string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ApiFieldError[],
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  getFieldError(field: string): string | undefined {
    return this.details?.find((item) => item.field === field)?.message;
  }

  get status(): number {
    return this.statusCode;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

const getApiBaseUrl = (): string => {
  let env: string | undefined;

  try {
    env = process.env.VITE_API_URL;
  } catch {
    env = undefined;
  }

  if (typeof env === 'string' && env.length > 0) {
    return env.replace(/\/+$/, '');
  }
  return '/api/v1';
};

export const apiClient = {
  async requestRaw<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers = new Headers(options.headers);
    let body: BodyInit | undefined;

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        body,
        credentials: options.credentials ?? 'include',
      });
    } catch (err: unknown) {
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        err instanceof Error
          ? err.message
          : 'Network error. Please check your internet connection.',
      );
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorPayload = (data as ApiErrorEnvelope | null)?.error;
      const code = errorPayload?.code ?? 'INTERNAL_ERROR';
      const message =
        errorPayload?.message ?? `Request failed with status code ${response.status}.`;
      const details = errorPayload?.details;
      const requestId = errorPayload?.requestId;

      throw new ApiClientError(response.status, code, message, details, requestId);
    }

    return data as T;
  },

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const data = await this.requestRaw<unknown>(endpoint, options);

    if (typeof data === 'object' && data !== null && 'data' in data) {
      return (data as { data: T }).data;
    }

    return data as T;
  },

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  getWithMeta<T>(endpoint: string, options?: RequestOptions): Promise<ApiSuccessResponse<T>> {
    return this.requestRaw<ApiSuccessResponse<T>>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
