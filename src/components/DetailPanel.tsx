import { useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { createSignedDownloadUrl, joinPath, type StorageEntry } from '../lib/storage';

type Props = {
  bucket: string;
  path: string;
  entries: StorageEntry[];
  selected: Set<string>;
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

export function DetailPanel({ bucket, path, entries, selected }: Props) {
  const [toast, setToast] = useState(false);
  const [copying, setCopying] = useState(false);

  const selectedNames = Array.from(selected);
  const count = selectedNames.length;

  if (count === 0) {
    return (
      <aside className="detail-panel">
        <div className="detail-panel-empty">파일을 선택해 상세 정보를 확인하세요.</div>
      </aside>
    );
  }

  if (count >= 2) {
    // Multi-select summary
    const selectedEntries = selectedNames
      .map((name) => entries.find((e) => e.name === name))
      .filter((e): e is StorageEntry => e !== undefined);

    const folderCount = selectedEntries.filter((e) => e.isFolder).length;
    const totalBytes = selectedEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);

    return (
      <aside className="detail-panel">
        <div className="detail-row">
          <label>선택</label>
          <span className="value">{count}개</span>
        </div>
        <div className="detail-row">
          <label>총 크기</label>
          <span className="value">
            {formatSize(totalBytes)}
            {folderCount > 0 && (
              <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>
                (폴더 {folderCount}개 제외)
              </span>
            )}
          </span>
        </div>
      </aside>
    );
  }

  // Single selection
  const name = selectedNames[0];
  const entry = entries.find((e) => e.name === name);

  if (!entry) {
    return (
      <aside className="detail-panel">
        <div className="detail-panel-empty">파일을 선택해 상세 정보를 확인하세요.</div>
      </aside>
    );
  }

  const fullPath = path ? joinPath(path, entry.name) : entry.name;

  async function handleCopyUrl() {
    if (copying) return;
    const client = getSupabase();
    if (!client) return;
    setCopying(true);
    try {
      const url = await createSignedDownloadUrl(client, bucket, fullPath);
      await navigator.clipboard.writeText(url);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setCopying(false);
    }
  }

  return (
    <aside className="detail-panel">
      <div className="detail-panel-icon">{entry.isFolder ? '📁' : '📄'}</div>
      <div className="detail-panel-name">{entry.name}</div>

      <div className="detail-row">
        <label>경로</label>
        <span className="value" style={{ userSelect: 'text' }}>
          {fullPath}
        </span>
      </div>

      <div className="detail-row">
        <label>유형</label>
        <span className="value">{entry.isFolder ? '폴더' : (entry.mimetype ?? '알 수 없음')}</span>
      </div>

      <div className="detail-row">
        <label>크기</label>
        <span className="value">{entry.isFolder ? '—' : formatSize(entry.size)}</span>
      </div>

      <div className="detail-row">
        <label>수정</label>
        <span className="value">{entry.isFolder ? '—' : formatDate(entry.lastModified)}</span>
      </div>

      {!entry.isFolder && (
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => void handleCopyUrl()}
            disabled={copying}
            style={{ width: '100%' }}
          >
            {copying ? '처리 중…' : 'URL 복사'}
          </button>
        </div>
      )}

      {toast && <div className="detail-toast">URL이 복사되었습니다.</div>}
    </aside>
  );
}
