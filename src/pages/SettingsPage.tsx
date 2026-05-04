import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getConfig, saveConfig, clearConfig } from '../lib/config';
import { useAuth } from '../hooks/useAuth';

export function SettingsPage() {
  const { session } = useAuth();
  const existing = getConfig();

  const [url, setUrl] = useState(existing?.url ?? '');
  const [anonKey, setAnonKey] = useState(existing?.anonKey ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-read config when it changes externally
  useEffect(() => {
    const cfg = getConfig();
    setUrl(cfg?.url ?? '');
    setAnonKey(cfg?.anonKey ?? '');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      saveConfig({ url, anonKey });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleClear = () => {
    if (!window.confirm('저장된 Supabase 설정을 지울까요?')) return;
    clearConfig();
    setUrl('');
    setAnonKey('');
    setError(null);
    setSaved(false);
  };

  const backLink = session ? '/' : '/login';
  const backLabel = session ? '대시보드로' : '로그인으로';

  return (
    <div className="auth-page">
      <div className="auth-card card settings-card">
        <div className="settings-header">
          <h1 className="auth-title">Supabase 설정</h1>
          <Link to={backLink} className="back-link">{backLabel}</Link>
        </div>

        <p className="settings-hint">
          Supabase 프로젝트 → Settings → API 에서 URL과 anon public key를 복사하세요.
        </p>

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
            <label htmlFor="anon-key">Supabase anon key</label>
            <textarea
              id="anon-key"
              className="text-input textarea-mono"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJ..."
              rows={4}
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}
          {saved && <div className="form-success">저장되었습니다.</div>}

          <div className="settings-actions">
            <button type="submit" className="btn btn-primary">저장</button>
            <button type="button" className="btn btn-danger" onClick={handleClear}>
              지우기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
