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
