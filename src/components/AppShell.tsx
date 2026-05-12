import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import { Database, FolderOpen, Moon, RotateCw, Settings, Sun } from 'lucide-react';
import { useBuckets } from '../hooks/useBuckets';
import { resolveInitialTheme, setTheme, type Theme } from '../lib/theme';

export function AppShell() {
  const navigate = useNavigate();
  const { bucket: activeBucket } = useParams<{ bucket?: string }>();
  const { buckets, loading, error, refresh } = useBuckets();
  const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  return (
    <div className="app-shell">
      {/* Top header */}
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-header-brand" aria-hidden>
            <FolderOpen size={14} strokeWidth={2.25} />
          </span>
          <span className="app-header-title">파일 매니저</span>
        </div>
        <div className="app-header-right">
          <button
            type="button"
            className="btn-icon"
            onClick={() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            aria-label="테마 전환"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <Link to="/settings" className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
            <Settings size={14} />
            설정
          </Link>
        </div>
      </header>

      {/* Body = sidebar + main */}
      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section-label">
            <span>Buckets</span>
            <button
              className="btn-icon"
              onClick={refresh}
              title="새로고침"
              aria-label="버킷 목록 새로고침"
            >
              <RotateCw size={13} />
            </button>
          </div>

          <div className="sidebar-list">
            {loading && (
              <div style={{ padding: '8px 10px' }}>
                <span className="spinner" />
              </div>
            )}
            {error && !loading && (
              <div className="sidebar-error">{error}</div>
            )}
            {!loading && !error && buckets.length === 0 && (
              <div className="sidebar-empty">접근 가능한 버킷 없음</div>
            )}
            {buckets.map((b) => {
              const isActive = activeBucket === b.name;
              return (
                <button
                  key={b.id}
                  className={`sidebar-item${isActive ? ' sidebar-item--active' : ''}`}
                  onClick={() => navigate(`/b/${b.name}`)}
                  title={b.name}
                >
                  <Database size={14} style={{ flexShrink: 0 }} />
                  <span className="sidebar-item-text">{b.name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main slot */}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
