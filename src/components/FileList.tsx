import type { FileObject } from '@supabase/storage-js';
import { getSupabase } from '../lib/supabaseClient';
import type { Track } from '../lib/tracks';

type Props = {
  track: Track;
  files: FileObject[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return bytes + ' B';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR');
}

export function FileList({ track, files, loading, error, onChanged }: Props) {
  const handleDownload = async (file: FileObject) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error: urlError } = await supabase.storage
      .from('tablet-apk')
      .createSignedUrl(`${track}/${file.name}`, 3600, { download: file.name });
    if (urlError || !data?.signedUrl) {
      alert('다운로드 URL 생성에 실패했습니다: ' + (urlError?.message ?? '알 수 없는 오류'));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (file: FileObject) => {
    if (!window.confirm(`정말 삭제할까요? ${file.name}`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error: removeError } = await supabase.storage
      .from('tablet-apk')
      .remove([`${track}/${file.name}`]);
    if (removeError) {
      alert('삭제에 실패했습니다: ' + removeError.message);
      return;
    }
    onChanged();
  };

  if (loading) {
    return <div className="file-list-status">파일 목록을 불러오는 중...</div>;
  }

  return (
    <div className="file-list">
      {error && <div className="file-list-error">{error}</div>}
      {files.length === 0 ? (
        <div className="file-list-empty">이 트랙에 업로드된 APK가 없습니다.</div>
      ) : (
        <table className="file-table">
          <thead>
            <tr>
              <th>파일명</th>
              <th>크기</th>
              <th>업로드 시각</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, idx) => (
              <tr key={file.name}>
                <td>
                  {file.name}
                  {idx === 0 && <span className="badge-latest">최신</span>}
                </td>
                <td>{file.metadata?.size != null ? formatSize(file.metadata.size as number) : '-'}</td>
                <td>{formatDate(file.created_at)}</td>
                <td className="file-actions">
                  <button className="btn btn-sm" onClick={() => handleDownload(file)}>
                    다운로드
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(file)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
