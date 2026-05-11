import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getConfig, saveConfig, clearConfig, validateSupabaseConnection } from '../lib/config';

export function SettingsPage() {
  const navigate = useNavigate();
  const existing = getConfig();

  useEffect(() => {
    document.title = '설정 | 파일 매니저';
  }, []);

  const [url, setUrl] = useState(existing?.url ?? '');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [authKey, setAuthKey] = useState(existing?.authKey ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const cfg = getConfig();
    setUrl(cfg?.url ?? '');
    setApiKey(cfg?.apiKey ?? '');
    setAuthKey(cfg?.authKey ?? '');
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setValidating(true);
    try {
      const normalized = await validateSupabaseConnection({ url, apiKey, authKey });
      saveConfig(normalized);
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

  const handleClear = () => {
    if (!window.confirm('저장된 Supabase 설정을 지울까요?')) return;
    clearConfig();
    setUrl('');
    setApiKey('');
    setAuthKey('');
    setError(null);
    setSaved(false);
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

        <p className="settings-hint">
          Supabase 프로젝트의 anon public key를 API key 칸에 붙여넣으세요.
          <br />
          Auth key는 RLS를 통과할 수 있는 Bearer 토큰이어야 합니다. (Supabase service_role key 또는 적절한 사용자 JWT)
        </p>

        <div className="warning-banner">
          ⚠ Auth key가 service_role이면 DB 전체 권한입니다. 외부 노출 금지.
        </div>

        <form onSubmit={handleSave} className="auth-form">
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

          {error && <div className="form-error">{error}</div>}
          {saved && <div className="form-success">저장되었습니다.</div>}

          <div className="settings-actions">
            <button type="submit" className="btn btn-primary" disabled={validating}>
              {validating ? '검증 중...' : '저장'}
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
