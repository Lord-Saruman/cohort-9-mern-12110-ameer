import { apiClient, ApiClientError } from '../src/shared/api/client';

describe('apiClient and ApiClientError', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('ApiClientError provides getFieldError helper', () => {
    const error = new ApiClientError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);

    expect(error.getFieldError('email')).toBe('Invalid email');
    expect(error.getFieldError('password')).toBeUndefined();

    const noDetails = new ApiClientError(500, 'INTERNAL_ERROR', 'Server error');
    expect(noDetails.getFieldError('email')).toBeUndefined();
  });

  it('supports get, post, patch, and delete HTTP methods', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { patched: true } }),
        } as Response);
      }
      if (method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          status: 204,
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { ok: true } }),
      } as Response);
    });

    const patchRes = await apiClient.patch<{ patched: boolean }>('/test-patch', { foo: 'bar' });
    expect(patchRes).toEqual({ patched: true });

    const deleteRes = await apiClient.delete<void>('/test-delete');
    expect(deleteRes).toBeUndefined();

    const getRes = await apiClient.get<{ ok: boolean }>('/test-get');
    expect(getRes).toEqual({ ok: true });
  });

  it('handles responses where payload is not wrapped in data property', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve('raw-string-response'),
    } as unknown as Response);

    const res = await apiClient.get<string>('/raw');
    expect(res).toBe('raw-string-response');
  });

  it('handles non-JSON error response from server', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as unknown as Response);

    await expect(apiClient.get('/bad-gateway')).rejects.toThrow(
      'Request failed with status code 502.',
    );
  });
});
