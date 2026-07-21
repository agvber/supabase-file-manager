import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import { Database, FolderOpen, Moon, Plus, RotateCw, Settings, Sun, X } from 'lucide-react';
import { useBuckets } from '../hooks/useBuckets';
import { getSupabase } from '../lib/supabaseClient';
import { resolveInitialTheme, setTheme, type Theme } from '../lib/theme';

export function AppShell() {
  const navigate = useNavigate();
  const { bucket: activeBucket } = useParams<{ bucket?: string }>();
  const { buckets, loading, error, refresh, addBucket, removeBucket } = useBuckets();
  const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (adding) addInputRef.current?.focus();
  }, [adding]);

  function closeAddForm() {
    setAdding(false);
    setNewName('');
    setAddError(null);
  }

  async function handleAddBucket() {
    const name = newName.trim();
    if (!name || addBusy) return;
    if (/[/\s]/.test(name)) {
      setAddError('버킷 이름에 공백이나 /를 쓸 수 없습니다.');
      return;
    }
    if (buckets.some((b) => b.name === name)) {
      setAddError('이미 목록에 있는 버킷입니다.');
      return;
    }
    const client = getSupabase();
    if (!client) return;
    setAddBusy(true);
    setAddError(null);
    // listBuckets 권한이 없어도 개별 버킷의 list는 storage.objects RLS만 통과하면 동작한다.
    // 인증/네트워크 문제를 여기서 걸러낸다. 없는 버킷은 서버 버전에 따라 "Bucket not found"
    // 대신 빈 결과가 올 수도 있어 오타 검출은 best-effort이며, RLS로 빈 결과는 성공으로 본다.
    const { error: probeError } = await client.storage.from(name).list('', { limit: 1 });
    setAddBusy(false);
    if (probeError) {
      setAddError(
        /bucket not found/i.test(probeError.message)
          ? `'${name}' 버킷을 찾을 수 없습니다. 이름을 확인하세요.`
          : `버킷에 접근할 수 없습니다: ${probeError.message}`,
      );
      return;
    }
    addBucket(name);
    closeAddForm();
    navigate(`/b/${name}`);
  }

  function handleRemoveBucket(name: string) {
    removeBucket(name);
    if (activeBucket === name) navigate('/');
  }

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
            {!loading &&
              buckets.map((b) => {
                const isActive = activeBucket === b.name;
                // 직접 추가한 버킷은 행 안에 제거 버튼이 있어 <button> 중첩을 피해 div로 렌더
                return b.manual ? (
                  <div
                    key={b.id}
                    className={`sidebar-item${isActive ? ' sidebar-item--active' : ''}`}
                    onClick={() => navigate(`/b/${b.name}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/b/${b.name}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={`${b.name} (직접 추가한 버킷)`}
                  >
                    <Database size={14} style={{ flexShrink: 0 }} />
                    <span className="sidebar-item-text">{b.name}</span>
                    <button
                      type="button"
                      className="sidebar-item-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBucket(b.name);
                      }}
                      aria-label={`${b.name} 버킷을 목록에서 제거`}
                      title="목록에서 제거 (버킷 자체는 삭제되지 않음)"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
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

            {!loading &&
              (adding ? (
                <div className="sidebar-add-form">
                  <input
                    ref={addInputRef}
                    className="text-input"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setAddError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleAddBucket();
                      if (e.key === 'Escape') closeAddForm();
                    }}
                    placeholder="버킷 이름"
                    disabled={addBusy}
                    spellCheck={false}
                    aria-label="추가할 버킷 이름"
                  />
                  {addError && <div className="form-error">{addError}</div>}
                  <div className="sidebar-add-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={closeAddForm}
                      disabled={addBusy}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void handleAddBucket()}
                      disabled={addBusy || !newName.trim()}
                    >
                      {addBusy ? <span className="spinner" /> : '추가'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="sidebar-add-btn"
                  onClick={() => setAdding(true)}
                >
                  <Plus size={13} strokeWidth={2} />
                  버킷 직접 추가
                </button>
              ))}

            {!loading && buckets.length === 0 && !adding && (
              <div className="sidebar-hint">
                버킷 목록 조회 권한이 없어도 이름을 알면 직접 추가해 사용할 수 있습니다.
              </div>
            )}
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
