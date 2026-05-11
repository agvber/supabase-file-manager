import { useParams, useNavigate, Link } from 'react-router-dom';

export function FileManagerPage() {
  const { bucket } = useParams<{ bucket: string }>();
  const navigate = useNavigate();
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">📁 {bucket}</h1>
        <div className="dashboard-header-right">
          <button onClick={() => navigate('/')} className="header-link">버킷 목록</button>
          <Link to="/settings" className="header-link">설정</Link>
        </div>
      </header>
      <main className="dashboard-main">
        <p>Stage 2에서 파일 테이블이 들어옵니다.</p>
      </main>
    </div>
  );
}
