const STORAGE_KEY = 'tablet-apk-supabase-config';
const CONFIG_CHANGE_EVENT = 'supabase-config-change';

export type LoginType = 'token' | 'password';

export type TokenConfig = {
  loginType: 'token';
  url: string;
  apiKey: string;   // anon — used as `apikey` header
  authKey: string;  // Bearer JWT (service_role or user JWT)
};

export type PasswordConfig = {
  loginType: 'password';
  url: string;
  apiKey: string;   // anon — used as `apikey` header
  email: string;    // prefill 편의용 — 비밀번호는 절대 저장하지 않음
};

export type SupabaseConfig = TokenConfig | PasswordConfig;

// GoTrue 세션 localStorage 키. 라이브러리 기본 키(sb-<호스트 첫 라벨>-auth-token)는
// GitHub Pages처럼 한 origin을 여러 앱이 공유하거나 self-hosted 도메인의 첫 라벨이
// 겹치면 충돌할 수 있어 명시적으로 지정한다. (sb-* 키를 와일드카드로 지우지 말 것)
export function authStorageKey(url: string): string {
  try {
    return `sfm-auth-${new URL(url).hostname}`;
  } catch {
    return 'sfm-auth-default';
  }
}

export function getConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.url !== 'string' || typeof obj.apiKey !== 'string') return null;
    if (obj.loginType === 'password') {
      if (typeof obj.email !== 'string') return null;
      return { loginType: 'password', url: obj.url, apiKey: obj.apiKey, email: obj.email };
    }
    // loginType이 없는 데이터는 이 필드 도입 전에 저장된 token 설정 — 읽기 시점에 마이그레이션.
    // (더 오래된 `anonKey` 형식은 여전히 missing 취급)
    if (
      (obj.loginType === undefined || obj.loginType === 'token') &&
      typeof obj.authKey === 'string'
    ) {
      return { loginType: 'token', url: obj.url, apiKey: obj.apiKey, authKey: obj.authKey };
    }
    return null;
  } catch {
    return null;
  }
}

// 공백 + zero-width 문자(U+200B/200C/200D/FEFF) 제거용
const INVISIBLE_CHARS = /[\s\u200B\u200C\u200D\uFEFF]+/g;

function normalizeBase(rawUrl: string, rawApiKey: string): { url: string; apiKey: string } {
  const url = rawUrl.trim();
  const apiKey = rawApiKey.replace(INVISIBLE_CHARS, '');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('올바른 URL 형식이 아닙니다.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Supabase URL은 https://로 시작해야 합니다.');
  }
  if (!apiKey) {
    throw new Error('API key가 비어있습니다.');
  }
  return { url: parsed.origin, apiKey };
}

export function normalizeConfig(cfg: TokenConfig): TokenConfig;
export function normalizeConfig(cfg: PasswordConfig): PasswordConfig;
export function normalizeConfig(cfg: SupabaseConfig): SupabaseConfig;
export function normalizeConfig(cfg: SupabaseConfig): SupabaseConfig {
  const base = normalizeBase(cfg.url, cfg.apiKey);
  if (cfg.loginType === 'password') {
    const email = cfg.email.trim();
    if (!email) {
      throw new Error('이메일이 비어있습니다.');
    }
    return { loginType: 'password', ...base, email };
  }
  const authKey = cfg.authKey.replace(INVISIBLE_CHARS, '');
  if (!authKey) {
    throw new Error('Auth key가 비어있습니다.');
  }
  return { loginType: 'token', ...base, authKey };
}

// token 모드 전용 — password 모드는 로그인 성공 자체가 URL/anon key/자격증명 검증이고,
// 사용자 JWT의 버킷 목록은 RLS에 따라 빈 배열이 정상이라 smoke test가 의미 없다.
export async function validateSupabaseConnection(cfg: TokenConfig): Promise<TokenConfig> {
  const normalized = normalizeConfig(cfg);
  const endpoint = `${normalized.url}/storage/v1/bucket`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: normalized.apiKey,
        Authorization: `Bearer ${normalized.authKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Supabase 서버에 연결할 수 없습니다. URL과 네트워크/CORS 설정을 확인하세요. (${reason})`);
  }
  if (res.status === 401) throw new Error('API key 또는 Auth key가 잘못되었습니다.');
  if (res.status === 403) throw new Error('권한이 없습니다. service_role key를 사용해보세요.');
  if (res.status >= 500) throw new Error(`Supabase 서버 오류 (HTTP ${res.status}).`);
  if (!res.ok) throw new Error(`Supabase 응답 오류 (HTTP ${res.status}). URL을 확인하세요.`);
  let body: unknown = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!Array.isArray(body)) throw new Error('Supabase 응답이 예상과 다릅니다. URL을 확인하세요.');
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
