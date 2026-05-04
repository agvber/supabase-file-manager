import { useState, useEffect, useRef } from 'react';
import type { Track } from '../lib/tracks';
import { getSupabase } from '../lib/supabaseClient';
import { getConfig } from '../lib/config';
import { uploadResumable } from '../lib/upload';

type Props = {
  track: Track;
  onUploaded: () => void;
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

export function UploadPanel({ track, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [objectName, setObjectName] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aborter, setAborter] = useState<(() => void) | null>(null);
  const uploading = aborter !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // beforeunload warning while uploading
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  // Clean up abort on unmount
  useEffect(() => {
    return () => {
      if (aborter) aborter();
    };
    // intentionally only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setObjectName(selected ? selected.name : '');
    setError(null);
    setProgress(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }
    const trimmed = objectName.trim();
    if (!trimmed) {
      setError('업로드 파일명을 입력해주세요.');
      return;
    }

    const config = getConfig();
    if (!config) {
      setError('Supabase 설정이 필요합니다.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase 클라이언트를 초기화할 수 없습니다.');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError('세션이 만료되었습니다. 다시 로그인하세요.');
      return;
    }

    setError(null);
    setProgress(0);

    const { promise, abort } = uploadResumable({
      supabaseUrl: config.url,
      accessToken: token,
      bucket: 'tablet-apk',
      objectPath: `${track}/${trimmed}`,
      file,
      onProgress(loaded, total) {
        if (total > 0) setProgress(Math.round((loaded / total) * 100));
      },
    });

    setAborter(() => abort);

    try {
      await promise;
      setFile(null);
      setObjectName('');
      setProgress(null);
      setAborter(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploaded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError('업로드 실패: ' + message);
      setProgress(null);
      setAborter(null);
    }
  };

  const handleAbort = () => {
    if (aborter) aborter();
    setAborter(null);
    setProgress(null);
    setError('업로드가 취소되었습니다.');
  };

  return (
    <div className="upload-panel card">
      <h3 className="upload-panel-title">APK 업로드</h3>
      <p className="upload-panel-hint">
        같은 이름의 파일이 있으면 <strong>덮어쓰기됩니다</strong>.
      </p>

      <div className="upload-row">
        <input
          ref={fileInputRef}
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          onChange={handleFileChange}
          disabled={uploading}
          className="file-input"
        />
        {file && (
          <span className="file-size-hint">({formatSize(file.size)})</span>
        )}
      </div>

      {file && (
        <div className="upload-row">
          <label className="upload-label">파일명</label>
          <input
            type="text"
            className="text-input"
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
            disabled={uploading}
            placeholder="저장할 파일명"
          />
        </div>
      )}

      {file && (
        <div className="upload-preview">
          업로드 경로 미리보기: <code>{track}/{objectName || '(파일명 입력 필요)'}</code>
        </div>
      )}

      {error && <div className="upload-error">{error}</div>}

      {progress !== null && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span className="progress-label">{progress}%</span>
        </div>
      )}

      <div className="upload-actions">
        {!uploading ? (
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            업로드
          </button>
        ) : (
          <button className="btn btn-danger" onClick={handleAbort}>
            취소
          </button>
        )}
      </div>
    </div>
  );
}
