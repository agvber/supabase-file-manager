import { useSearchParams, Link } from 'react-router-dom';
import { useTrackFiles } from '../hooks/useTrackFiles';
import { TrackTabs } from '../components/TrackTabs';
import { FileList } from '../components/FileList';
import { UploadPanel } from '../components/UploadPanel';
import { isTrack } from '../lib/tracks';
import type { Track } from '../lib/tracks';

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTrack = searchParams.get('track') ?? 'production';
  const currentTrack: Track = isTrack(rawTrack) ? rawTrack : 'production';

  const { files, loading, error, refresh } = useTrackFiles(currentTrack);

  const handleTrackChange = (t: Track) => {
    setSearchParams({ track: t });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">태블릿 APK 버전 관리</h1>
        <div className="dashboard-header-right">
          <Link to="/settings" className="header-link">설정</Link>
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
