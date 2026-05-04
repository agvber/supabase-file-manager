import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTrackFiles } from '../hooks/useTrackFiles';
import { TrackTabs } from '../components/TrackTabs';
import { FileList } from '../components/FileList';
import { UploadPanel } from '../components/UploadPanel';
import { isTrack } from '../lib/tracks';
import type { Track } from '../lib/tracks';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTrack = searchParams.get('track') ?? 'production';
  const currentTrack: Track = isTrack(rawTrack) ? rawTrack : 'production';

  const { files, loading, error, refresh } = useTrackFiles(currentTrack);

  const handleTrackChange = (t: Track) => {
    setSearchParams({ track: t });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">태블릿 APK 버전 관리</h1>
        <div className="dashboard-header-right">
          <span className="dashboard-email">{user?.email}</span>
          <Link to="/settings" className="header-link">설정</Link>
          <button className="btn btn-sm" onClick={handleSignOut}>로그아웃</button>
        </div>
      </header>

      <main className="dashboard-main">
        <TrackTabs current={currentTrack} onChange={handleTrackChange} />

        <div className="dashboard-content">
          <UploadPanel track={currentTrack} onUploaded={refresh} />
          <FileList
            track={currentTrack}
            files={files}
            loading={loading}
            error={error}
            onChanged={refresh}
          />
        </div>
      </main>
    </div>
  );
}
