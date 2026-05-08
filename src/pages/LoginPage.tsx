import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ConfigBanner } from '../components/ConfigBanner';
import { getConfig } from '../lib/config';

function toKoreanError(message: string): string {
  if (message === 'Invalid login credentials') {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  return message;
}

function safeRedirectPath(input: unknown): string {
  if (typeof input !== 'string') return '/';
  if (!input.startsWith('/') || input.startsWith('//')) return '/';
  return input;
}

export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const config = getConfig();
  const from = safeRedirectPath((location.state as { from?: unknown } | null)?.from);

  // If already logged in, redirect
  useEffect(() => {
    if (!loading && session) {
      navigate(from, { replace: true });
    }
  }, [loading, session, navigate, from]);

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(toKoreanError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1 className="auth-title">태블릿 APK 버전 관리</h1>
        <h2 className="auth-subtitle">로그인</h2>

        <ConfigBanner />

        {!config && (
          <p className="auth-config-note">로그인하려면 먼저 Supabase 설정이 필요합니다.</p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">아이디</label>
            <input
              id="email"
              type="text"
              className="text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={!config || submitting}
          >
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/settings">설정 페이지로</Link>
        </div>
      </div>
    </div>
  );
}
