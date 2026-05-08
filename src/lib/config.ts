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

export function saveConfig(cfg: SupabaseConfig): void {
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
  const SUPABASE_HOST_SUFFIX = '.supabase.co';
  if (!parsed.host.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new Error('Supabase URL은 https://<project-id>.supabase.co 형식이어야 합니다.');
  }
  const projectId = parsed.host.slice(0, -SUPABASE_HOST_SUFFIX.length);
  if (!projectId || projectId.includes('.')) {
    throw new Error('Supabase URL은 https://<project-id>.supabase.co 형식이어야 합니다.');
  }
  if (!/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(anonKey)) {
    throw new Error('anon key 형식이 올바르지 않습니다. (Supabase 프로젝트의 anon public key를 그대로 붙여넣으세요)');
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: parsed.origin, anonKey }));
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
