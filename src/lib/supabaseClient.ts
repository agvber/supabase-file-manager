import { createClient, SupabaseClient, type AuthError } from '@supabase/supabase-js';
import {
  authStorageKey,
  getConfig,
  normalizeConfig,
  subscribeConfig,
  type TokenConfig,
} from './config';

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getConfig();
  if (!config) {
    resetSupabase();
    return null;
  }
  const key =
    config.loginType === 'password'
      ? ['password', config.url, config.apiKey, config.email].join('|')
      : ['token', config.url, config.apiKey, config.authKey].join('|');
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }
  resetSupabase();
  cachedClient =
    config.loginType === 'password'
      ? // 전역 Authorization 헤더를 넣지 않아야 supabase-js가 요청마다
        // 세션 access_token을 자동 주입한다 (없으면 anon key로 fallback).
        createClient(config.url, config.apiKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: authStorageKey(config.url),
          },
        })
      : createClient(config.url, config.apiKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${config.authKey}`,
            },
          },
        });
  cachedKey = key;
  return cachedClient;
}

export function resetSupabase(): void {
  if (cachedClient) {
    // 버려지는 클라이언트의 백그라운드 세션 갱신 타이머 정리 (token 모드에선 no-op)
    void cachedClient.auth.stopAutoRefresh().catch(() => {});
  }
  cachedClient = null;
  cachedKey = null;
}

// tus 업로드처럼 supabase-js 밖에서 쓸 Bearer 토큰.
// password 모드는 세션에서 읽으며, 만료된 세션은 getSession()이 갱신을 시도한다.
export async function getAccessToken(): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;
  if (config.loginType === 'token') return config.authKey;
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

// password 모드에서 세션이 사라졌는지 확인. supabase-js는 세션이 없으면 조용히
// anon key로 fallback해 빈 목록만 보이므로, 호출 전에 확인해 재로그인을 안내한다.
export async function isSessionExpired(): Promise<boolean> {
  const config = getConfig();
  if (config?.loginType !== 'password') return false;
  return (await getAccessToken()) === null;
}

// 요청별 타임아웃을 거는 fetch 래퍼 (검증/로그인용 일회성 클라이언트 공용)
function timeoutFetch(ms: number): typeof fetch {
  return (input, init) =>
    fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(ms) });
}

// token 모드 전용 — password 모드는 로그인 성공 자체가 URL/anon key/자격증명 검증이고,
// 사용자 JWT의 버킷 목록은 RLS에 따라 빈 배열이 정상이라 smoke test가 의미 없다.
export async function validateSupabaseConnection(cfg: TokenConfig): Promise<TokenConfig> {
  const normalized = normalizeConfig(cfg);
  // token 모드 실클라이언트(getSupabase)와 같은 구성에 8초 타임아웃만 더한 일회용 클라이언트
  const temp = createClient(normalized.url, normalized.apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { Authorization: `Bearer ${normalized.authKey}` },
      fetch: timeoutFetch(8000),
    },
  });
  const { data, error } = await temp.storage.listBuckets();
  if (error) {
    // HTTP 응답 오류(StorageApiError)만 숫자 status를 가진다.
    // 없으면 네트워크/타임아웃/비JSON 응답(StorageUnknownError).
    const status = (error as { status?: unknown }).status;
    if (typeof status !== 'number') {
      throw new Error(
        `Supabase 서버에 연결할 수 없습니다. URL과 네트워크/CORS 설정을 확인하세요. (${error.message})`,
      );
    }
    if (status === 401) throw new Error('API key 또는 Auth key가 잘못되었습니다.');
    if (status === 403) throw new Error('권한이 없습니다. service_role key를 사용해보세요.');
    if (status >= 500) throw new Error(`Supabase 서버 오류 (HTTP ${status}).`);
    throw new Error(`Supabase 응답 오류 (HTTP ${status}). URL을 확인하세요.`);
  }
  if (!Array.isArray(data)) throw new Error('Supabase 응답이 예상과 다릅니다. URL을 확인하세요.');
  return normalized;
}

// 설정 페이지 로그인 검증용. 실제 클라이언트와 같은 storageKey를 쓰는 임시 클라이언트로
// 로그인하므로, 성공 시 persist된 세션을 이후 getSupabase() 클라이언트가 그대로 복구한다.
// 실패 시 기존 config/세션은 건드리지 않는다. 임시 클라이언트가 하나 더 생기며 뜨는
// "Multiple GoTrueClient instances" 콘솔 경고는 무해하다.
export async function loginWithPassword(params: {
  url: string;
  apiKey: string;
  email: string;
  password: string;
}): Promise<void> {
  const temp = createClient(params.url, params.apiKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: authStorageKey(params.url),
    },
    global: {
      fetch: timeoutFetch(10000),
    },
  });
  const { error } = await temp.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (error) {
    throw new Error(mapAuthError(error));
  }
}

function mapAuthError(error: AuthError): string {
  const code = error.code;
  const status = error.status;
  const msg = error.message ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
    return '이메일 인증이 완료되지 않은 계정입니다.';
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (code === 'email_provider_disabled' || /email logins are disabled/i.test(msg)) {
    return '이 프로젝트는 이메일 로그인이 비활성화되어 있습니다. Supabase Auth 설정을 확인하세요.';
  }
  if (code === 'user_banned') {
    return '차단된 계정입니다.';
  }
  if (/no api key|invalid api key/i.test(msg)) {
    return 'API key(anon)가 올바르지 않습니다.';
  }
  if (
    error.name === 'AuthRetryableFetchError' ||
    status === 0 ||
    /abort|timeout|timed out|fetch|network/i.test(msg)
  ) {
    return 'Supabase 서버에 연결할 수 없습니다. URL과 네트워크/CORS 설정을 확인하세요.';
  }
  if (typeof status === 'number' && status >= 500) {
    return `Supabase 서버 오류 (HTTP ${status}).`;
  }
  if (!msg) return '로그인에 실패했습니다.';
  return msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
}

// Auto-reset when config changes
subscribeConfig(resetSupabase);
