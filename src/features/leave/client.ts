let csrfToken = '';

export async function localLeaveApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/local-leave-api${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Leave-CSRF': csrfToken },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
  let data: T & { error?: string; csrfToken?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error('The local leave service is unavailable. Start it with npm run dev:leave.');
  }
  if (!response.ok) {
    if (response.status === 401 && path !== '/login')
      window.dispatchEvent(new Event('attendiq:unauthorized'));
    throw new Error(data.error || 'The request could not be completed.');
  }
  if (data.csrfToken !== undefined) csrfToken = data.csrfToken;
  return data;
}

export const leaveNames = { SL: 'Sick leave', CL: 'Casual leave' };
export const currentYear = () => new Date().getFullYear();
export const policyYears = () => Array.from({ length: 101 }, (_, index) => 2000 + index);
export const displayDate = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
