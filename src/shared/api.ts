export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let token = '';
export function setCsrfToken(value: string) {
  token = value;
}
export async function api<T>(route: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}api/index.php?route=${encodeURIComponent(route)}`,
    {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': token } : {}),
      },
      body: method !== 'GET' ? JSON.stringify(body || {}) : undefined,
    },
  );
  let data: T & { error?: string; csrfToken?: string };
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      502,
      'The PHP API is unavailable. Start the backend or check server configuration.',
    );
  }
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('attendiq:unauthorized'));
    throw new ApiError(response.status, data.error || 'Request failed.');
  }
  if (data.csrfToken) setCsrfToken(data.csrfToken);
  return data;
}
