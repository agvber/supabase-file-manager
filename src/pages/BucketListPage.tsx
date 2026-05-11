import { useNavigate, Link } from 'react-router-dom';
import { useBuckets } from '../hooks/useBuckets';

export function BucketListPage() {
  const navigate = useNavigate();
  const { buckets, loading, error, refresh } = useBuckets();

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
        {error && <div className="warning-banner">{error}</div>}
        {loading && <p className="loading" style={{ height: 'auto', padding: '32px 0' }}>버킷 목록을 불러오는 중...</p>}
        {!loading && !error && buckets.length === 0 && (
          <p className="file-list-empty">
            접근 가능한 버킷이 없습니다. Auth key가 service_role인지 확인하세요.
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
