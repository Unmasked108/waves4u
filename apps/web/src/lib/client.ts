export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

type Init = { method?: string; body?: unknown };

function send(path: string, init: Init) {
  return fetch('/api' + path, {
    method: init.method || 'GET',
    credentials: 'include',
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

/** Browser-side call to the backend (through the /api proxy, same origin, cookies included). */
export async function api<T = any>(path: string, init: Init = {}): Promise<T> {
  let res = await send(path, init);

  // Logins last 15 minutes. If one expired mid-session, renew it once and retry the request.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const session = await fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .catch(() => null);
    if (session?.user) res = await send(path, init);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || (res.status === 429 ? 'Too many attempts. Please wait a few minutes.' : 'Request failed'), data.fields);
  return data as T;
}
