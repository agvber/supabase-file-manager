import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  authStorageKey,
  clearConfig,
  getConfig,
  normalizeConfig,
  saveConfig,
  type LoginType,
} from '../lib/config';
import {
  getSupabase,
  isSessionExpired,
  loginWithPassword,
  validateSupabaseConnection,
} from '../lib/supabaseClient';

type SessionState = 'unknown' | 'active' | 'expired';

export function SettingsPage() {
  const navigate = useNavigate();
  const existing = getConfig();

  useEffect(() => {
    document.title = '설정 | 파일 매니저';
  }, []);

  const [loginType, setLoginType] = useState<LoginType>(existing?.loginType ?? 'token');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [authKey, setAuthKey] = useState(existing?.loginType === 'token' ? existing.authKey : '');
  const [email, setEmail] = useState(existing?.loginType === 'password' ? existing.email : '');
  const [password, setPassword] = useState(''); // 절대 저장하지 않음
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('unknown');

  useEffect(() => {
    if (existing?.loginType !== 'password') return;
    let alive = true;
    void isSessionExpired().then((expired) => {
      if (alive) setSessionState(expired ? 'expired' : 'active');
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(next: LoginType) {
    setLoginType(next);
    setError(null);
    setSaved(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setValidating(true);
    try {
      const existingBefore = getConfig();
      if (loginType === 'token') {
        const normalized = await validateSupabaseConnection({
          loginType: 'token',
          url,
          apiKey,
          authKey,
        });
        if (existingBefore?.loginType === 'password') {
          // 남는 세션 정리 — saveConfig 전, 캐시된 password 클라이언트가 살아있을 때.
          // signOut은 네트워크 실패 시 로컬 세션을 지우지 않으므로 키 제거도 함께.
          await getSupabase()?.auth.signOut({ scope: 'local' }).catch(() => {});
          localStorage.removeItem(authStorageKey(existingBefore.url));
        }
        saveConfig(normalized);
      } else {
        const normalized = normalizeConfig({
          loginType: 'password',
          url,
          apiKey,
          email,
        });
        await loginWithPassword({
          url: normalized.url,
          apiKey: normalized.apiKey,
          email: normalized.email,
          password,
        });
        if (
          existingBefore?.loginType === 'password' &&
          authStorageKey(existingBefore.url) !== authStorageKey(normalized.url)
        ) {
          localStorage.removeItem(authStorageKey(existingBefore.url));
        }
        saveConfig(normalized);
        setPassword('');
        setSessionState('active');
      }
      setSaved(true);
      setTimeout(() => {
        navigate('/');
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setValidating(false);
    }
  };

  const handleClear = async () => {
    const cfg = getConfig();
    const confirmMsg =
      cfg?.loginType === 'password'
        ? '저장된 Supabase 설정을 지우고 로그아웃할까요?'
        : '저장된 Supabase 설정을 지울까요?';
    if (!window.confirm(confirmMsg)) return;
    if (cfg?.loginType === 'password') {
      await getSupabase()?.auth.signOut({ scope: 'local' }).catch(() => {});
      localStorage.removeItem(authStorageKey(cfg.url));
    }
    clearConfig();
    setUrl('');
    setApiKey('');
    setAuthKey('');
    setEmail('');
    setPassword('');
    setError(null);
    setSaved(false);
    setSessionState('unknown');
  };

  return (
    <div className="auth-page">
      <div className="auth-card card settings-card">
        <div className="settings-header">
          <h1 className="auth-title">Supabase 설정</h1>
          <Link to="/" className="back-link">
            <ArrowLeft size={13} />
            돌아가기
          </Link>
        </div>

        {loginType === 'token' ? (
          <>
            <p className="settings-hint">
              Supabase 프로젝트의 anon public key를 API key 칸에 붙여넣으세요.
              <br />
              Auth key는 RLS를 통과할 수 있는 Bearer 토큰이어야 합니다. (Supabase service_role key 또는 적절한 사용자 JWT)
            </p>

            <div className="warning-banner">
              ⚠ Auth key가 service_role이면 DB 전체 권한입니다. 외부 노출 금지.
            </div>
          </>
        ) : (
          <p className="settings-hint">
            Supabase Auth에 등록된 이메일/비밀번호로 로그인합니다.
            <br />
            로그인 후 발급된 JWT 세션으로 인증하며, 파일 접근 권한은 로그인한 사용자의 RLS 정책을 따릅니다.
          </p>
        )}

        {loginType === 'password' && existing?.loginType === 'password' && sessionState !== 'unknown' && (
          sessionState === 'expired' ? (
            <div className="form-error">세션이 만료되었습니다. 다시 로그인해주세요.</div>
          ) : (
            <div className="form-success">현재 {existing.email} 계정으로 로그인되어 있습니다.</div>
          )
        )}

        <form onSubmit={handleSave} className="auth-form">
          <div className="form-group">
            <label id="login-type-label">로그인 방식</label>
            <div className="segmented" role="group" aria-labelledby="login-type-label">
              <button
                type="button"
                className={`segmented-option${loginType === 'token' ? ' segmented-option--active' : ''}`}
                aria-pressed={loginType === 'token'}
                onClick={() => switchMode('token')}
              >
                Auth Key (토큰)
              </button>
              <button
                type="button"
                className={`segmented-option${loginType === 'password' ? ' segmented-option--active' : ''}`}
                aria-pressed={loginType === 'password'}
                onClick={() => switchMode('password')}
              >
                이메일 로그인
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="supabase-url">Supabase URL</label>
            <input
              id="supabase-url"
              type="url"
              className="text-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="api-key">API key (anon)</label>
            <textarea
              id="api-key"
              className="text-input textarea-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="eyJ..."
              rows={4}
              required
            />
          </div>
          {loginType === 'token' ? (
            <div className="form-group">
              <label htmlFor="auth-key">Auth key (Bearer JWT)</label>
              <textarea
                id="auth-key"
                className="text-input textarea-mono"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="eyJ..."
                rows={4}
                required
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="login-email">이메일</label>
                <input
                  id="login-email"
                  type="email"
                  className="text-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">비밀번호</label>
                <input
                  id="login-password"
                  type="password"
                  className="text-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}
          {saved && <div className="form-success">저장되었습니다.</div>}

          <div className="settings-actions">
            <button type="submit" className="btn btn-primary" disabled={validating}>
              {loginType === 'token'
                ? validating
                  ? '검증 중...'
                  : '저장'
                : validating
                  ? '로그인 중...'
                  : '로그인'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleClear}
              disabled={validating}
            >
              지우기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
