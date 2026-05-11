import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBuckets } from '../hooks/useBuckets';

export function BucketListPage() {
  const navigate = useNavigate();
  const { buckets, loading, error, refresh } = useBuckets();

  useEffect(() => {
    document.title = '버킷 목록 | 파일 매니저';
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">파일 매니저</h1>
        <div className="dashboard-header-right">
          <Link to="/settings" className="header-link">설정</Link>
          <button onClick={refresh} className="btn btn-sm">새로고침</button>
        </div>
      </header>
      <main className="dashboard-main">
        {error && (
          <div className="warning-banner">
            {error}
            {(error.includes('Auth key') || error.includes('권한') || error.includes('401') || error.includes('403')) && (
              <div style={{ marginTop: 6, fontWeight: 400, fontSize: 12 }}>
                Auth key가 <code>service_role</code>인지 확인하세요.{' '}
                <Link to="/settings" style={{ color: '#b45309' }}>설정 페이지</Link>에서 변경할 수 있습니다.
              </div>
            )}
          </div>
        )}
        {loading && (
          <div className="loading" style={{ height: 'auto', padding: '32px 0' }}>
            <span className="spinner" style={{ marginRight: 10 }} />
            버킷 목록을 불러오는 중...
          </div>
        )}
        {!loading && !error && buckets.length === 0 && (
          <p className="file-list-empty">
            접근 가능한 버킷이 없습니다. Supabase Studio에서 버킷을 생성하거나, Auth key의 권한을 확인하세요.
          </p>
        )}
        {!loading && buckets.length > 0 && (
          <div className="bucket-grid">
            {buckets.map((b) => (
              <div
                key={b.id}
                className="bucket-card"
                onClick={() => navigate(`/b/${b.name}`)}
              >
                <div className="bucket-name">{b.name}</div>
                <div className="bucket-meta">
                  <span className={`bucket-badge ${b.public ? 'bucket-badge--public' : 'bucket-badge--private'}`}>
                    {b.public ? 'public' : 'private'}
                  </span>
                  <span style={{ marginLeft: 8 }}>
                    생성일: {new Date(b.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
