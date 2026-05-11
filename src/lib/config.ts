const STORAGE_KEY = 'tablet-apk-supabase-config';
const CONFIG_CHANGE_EVENT = 'supabase-config-change';

export type SupabaseConfig = {
  url: string;
  apiKey: string;   // anon — used as `apikey` header
  authKey: string;  // Bearer JWT (service_role or user JWT)
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
      'apiKey' in parsed &&
      'authKey' in parsed &&
      typeof (parsed as Record<string, unknown>).url === 'string' &&
      typeof (parsed as Record<string, unknown>).apiKey === 'string' &&
      typeof (parsed as Record<string, unknown>).authKey === 'string'
    ) {
      return parsed as SupabaseConfig;
    }
    // Backward-compat: old data had `anonKey` instead of `apiKey`/`authKey` — treat as missing
    return null;
  } catch {
    return null;
  }
}

function normalizeConfig(cfg: SupabaseConfig): SupabaseConfig {
  const url = cfg.url.trim();
  const apiKey = cfg.apiKey.replace(/[\s​‌‍﻿]+/g, '');
  const authKey = cfg.authKey.replace(/[\s​‌‍﻿]+/g, '');
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
  if (!authKey) {
    throw new Error('Auth key가 비어있습니다.');
  }
  return { url: parsed.origin, apiKey, authKey };
}

export async function validateSupabaseConnection(cfg: SupabaseConfig): Promise<SupabaseConfig> {
  const normalized = normalizeConfig(cfg);
  const endpoint = `${normalized.url}/storage/v1/object/list/tablet-apk`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: normalized.apiKey,
        Authorization: `Bearer ${normalized.authKey}`,
        'Content-Type': 'application/json',
      },
      body: '{"limit":1,"prefix":""}',
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Supabase 서버에 연결할 수 없습니다. URL과 네트워크/CORS 설정을 확인하세요. (${reason})`,
    );
  }

  if (res.status === 200 || res.status === 206) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      throw new Error('Supabase 응답이 예상과 다릅니다. URL을 확인하세요.');
    }
    if (!Array.isArray(body)) {
      throw new Error('Supabase 응답이 예상과 다릅니다. URL을 확인하세요.');
    }
    return normalized;
  }

  if (res.status === 400) {
    // Request shape mismatch but URL+auth OK — treat as pass if response has Supabase error shape
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      throw new Error('Supabase 응답이 예상과 다릅니다. URL을 확인하세요.');
    }
    if (typeof body !== 'object' || body === null) {
      throw new Error('Supabase 응답이 예상과 다릅니다. URL을 확인하세요.');
    }
    return normalized;
  }

  if (res.status === 401) {
    throw new Error('API key 또는 Auth key가 잘못되었습니다.');
  }
  if (res.status === 403) {
    throw new Error('권한이 없습니다. RLS 정책 또는 Auth key의 role을 확인하세요.');
  }
  if (res.status === 404) {
    throw new Error('버킷 `tablet-apk`를 찾을 수 없습니다. URL을 확인하세요.');
  }
  if (res.status >= 500) {
    throw new Error(`Supabase 서버 오류 (HTTP ${res.status}). 잠시 후 다시 시도하세요.`);
  }

  // Any other status
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  if (typeof body !== 'object' || body === null) {
    throw new Error('Supabase 응답이 예상과 다릅니다. URL을 확인하세요.');
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
