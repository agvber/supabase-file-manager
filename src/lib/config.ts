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
  const anonKey = cfg.anonKey.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('올바른 URL 형식이 아닙니다.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Supabase URL은 https://로 시작해야 합니다.');
  }
  if (!/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(anonKey)) {
    throw new Error('anon key 형식이 올바르지 않습니다. (Supabase 프로젝트의 anon public key를 그대로 붙여넣으세요)');
  }
  return { url: parsed.origin, anonKey };
}

export async function validateSupabaseConnection(cfg: SupabaseConfig): Promise<SupabaseConfig> {
  const normalized = normalizeConfig(cfg);
  const endpoint = `${normalized.url}/auth/v1/settings`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      headers: {
        apikey: normalized.anonKey,
        Authorization: `Bearer ${normalized.anonKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Supabase 서버에 연결할 수 없습니다. URL과 네트워크/CORS 설정을 확인하세요. (${reason})`,
    );
  }
  if (res.status === 401) {
    throw new Error('anon key가 잘못되었거나 권한이 없습니다.');
  }
  if (res.status === 404) {
    throw new Error('해당 URL은 Supabase 인증 엔드포인트를 제공하지 않습니다.');
  }
  if (!res.ok) {
    throw new Error(`Supabase 응답 오류 (HTTP ${res.status}). URL을 확인하세요.`);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error('Supabase 응답이 JSON 형식이 아닙니다. URL이 올바른지 확인하세요.');
  }
  if (typeof body !== 'object' || body === null) {
    throw new Error('Supabase 인증 서비스로 보이지 않습니다.');
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
