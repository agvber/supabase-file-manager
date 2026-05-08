const STORAGE_KEY = 'tablet-apk-supabase-config';
const CONFIG_CHANGE_EVENT = 'supabase-config-change';

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'url' in parsed &&
      'anonKey' in parsed &&
      typeof (parsed as Record<string, unknown>).url === 'string' &&
      typeof (parsed as Record<string, unknown>).anonKey === 'string'
    ) {
      return parsed as SupabaseConfig;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeConfig(cfg: SupabaseConfig): SupabaseConfig {
  const url = cfg.url.trim();
  const anonKey = cfg.anonKey.replace(/[\s\u200B\u200C\u200D\uFEFF]+/g, '');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('올바른 URL 형식이 아닙니다.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Supabase URL은 https://로 시작해야 합니다.');
  }
  if (!anonKey) {
    throw new Error('anon key가 비어있습니다.');
  }
  return { url: parsed.origin, anonKey };
}

export async function validateSupabaseConnection(cfg: SupabaseConfig): Promise<SupabaseConfig> {
  const normalized = normalizeConfig(cfg);
  // Probe /auth/v1/token instead of /auth/v1/settings: the latter is sometimes
  // gated by an upstream HTTP Basic Auth (Kong), but token issuance is gated
  // only by apikey on standard Supabase deploys. Empty body → GoTrue returns
  // a 400 with a Supabase-shaped JSON error, confirming URL + anon key reach
  // the auth service.
  const endpoint = `${normalized.url}/auth/v1/token?grant_type=password`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: normalized.anonKey,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Supabase 서버에 연결할 수 없습니다. URL과 네트워크/CORS 설정을 확인하세요. (${reason})`,
    );
  }
  if (res.status === 401) {
    const wwwAuth = res.headers.get('www-authenticate') ?? '';
    if (/^basic/i.test(wwwAuth)) {
      throw new Error(
        '게이트웨이(HTTP Basic Auth)가 인증 엔드포인트를 차단하고 있습니다. 운영자에게 /auth/v1/* 경로의 Basic Auth 해제를 요청하세요.',
      );
    }
    throw new Error('anon key가 잘못되었거나 권한이 없습니다.');
  }
  if (res.status === 404) {
    throw new Error('해당 URL은 Supabase 인증 엔드포인트를 제공하지 않습니다.');
  }
  if (res.status >= 500) {
    throw new Error(`Supabase 서버 오류 (HTTP ${res.status}). 잠시 후 다시 시도하세요.`);
  }
  // 400/422: GoTrue가 누락 필드(이메일/비번 없음)를 알려옴 — URL + apikey 정상 신호
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* JSON 아님 */
  }
  if (typeof body !== 'object' || body === null) {
    throw new Error('Supabase 응답이 인증 서비스 형식이 아닙니다. URL이 올바른지 확인하세요.');
  }
  return normalized;
}

export function saveConfig(cfg: SupabaseConfig): void {
  const normalized = normalizeConfig(cfg);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(CONFIG_CHANGE_EVENT));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CONFIG_CHANGE_EVENT));
}

export function subscribeConfig(cb: () => void): () => void {
  window.addEventListener(CONFIG_CHANGE_EVENT, cb);
  return () => window.removeEventListener(CONFIG_CHANGE_EVENT, cb);
}
