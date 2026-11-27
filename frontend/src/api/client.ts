// Thin HTTP client for the Qaryati API (/api/v1). Converts the backend's
// error format { error: { status, message, requestId } } into ApiError.
const BASE = '/api/v1';
const TOKEN_KEY = 'qaryati.token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public requestId?: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable: session lasts for this tab only */
    }
  },
};

type Query = Record<string, string | number | undefined | null>;

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {}))
    if (value !== undefined && value !== null && value !== '')
      params.set(key, String(value));
  const url = `${BASE}${path}${params.size ? `?${params}` : ''}`;
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'تعذّر الاتصال بالخادم. تأكدي أن الـ API يعمل.');
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const err = (data as { error?: { message?: string | string[]; requestId?: string } })
      ?.error;
    const raw = err?.message;
    const message = Array.isArray(raw) ? raw.join(' • ') : raw;
    throw new ApiError(res.status, friendly(res.status, message), err?.requestId);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function friendly(status: number, message?: string): string {
  switch (status) {
    case 401:
      return 'يجب تسجيل الدخول (أو انتهت الجلسة).';
    case 403:
      return 'صلاحياتك لا تسمح بهذه العملية.';
    case 409:
      return `تعارض في البيانات: ${message ?? ''} — أعيدي تحميل الصفحة وحاولي مرة أخرى.`;
    case 503:
      return 'الخدمة الخارجية غير متاحة حالياً، حاولي لاحقاً أو أدخلي البيانات يدوياً.';
    case 429:
      return 'طلبات كثيرة، انتظري قليلاً ثم حاولي.';
    default:
      return message ?? `خطأ غير متوقع (${status})`;
  }
}
