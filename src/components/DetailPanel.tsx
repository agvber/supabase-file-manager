import { useState } from 'react';
import { X, File, Folder, Image, FileText } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';
import { createSignedDownloadUrl, joinPath, type StorageEntry } from '../lib/storage';

type Props = {
  bucket: string;
  path: string;
  entries: StorageEntry[];
  selected: Set<string>;
  onClose: () => void;
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

function FileIcon({ entry }: { entry: StorageEntry }) {
  if (entry.isFolder) return <Folder size={36} strokeWidth={1.25} />;
  const mime = entry.mimetype ?? '';
  if (mime.startsWith('image/')) return <Image size={36} strokeWidth={1.25} />;
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml'))
    return <FileText size={36} strokeWidth={1.25} />;
  return <File size={36} strokeWidth={1.25} />;
}

export function DetailPanel({ bucket, path, entries, selected, onClose }: Props) {
  const [toast, setToast] = useState(false);
  const [copying, setCopying] = useState(false);

  const selectedNames = Array.from(selected);
  const count = selectedNames.length;

  if (count === 0) return null;

  if (count >= 2) {
    const selectedEntries = selectedNames
      .map((name) => entries.find((e) => e.name === name))
      .filter((e): e is StorageEntry => e !== undefined);

    const folderCount = selectedEntries.filter((e) => e.isFolder).length;
    const totalBytes = selectedEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);

    return (
      <aside className="detail-panel-overlay">
        <div className="detail-panel-header">
          <span className="detail-panel-heading">{count}개 선택됨</span>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <X size={15} />
          </button>
        </div>
        <div className="detail-panel-body">
          <div className="detail-row">
            <label>선택</label>
            <span className="value">{count}개</span>
          </div>
          <div className="detail-row">
            <label>총 크기</label>
            <span className="value">
              {formatSize(totalBytes)}
              {folderCount > 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>
                  (폴더 {folderCount}개 제외)
                </span>
              )}
            </span>
          </div>
        </div>
      </aside>
    );
  }

  // Single selection
  const name = selectedNames[0];
  const entry = entries.find((e) => e.name === name);

  if (!entry) return null;

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
    <aside className="detail-panel-overlay">
      <div className="detail-panel-header">
        <span className="detail-panel-heading">파일 정보</span>
        <button className="btn-icon" onClick={onClose} aria-label="닫기">
          <X size={15} />
        </button>
      </div>

      <div className="detail-panel-body">
        <div className="detail-panel-icon">
          <FileIcon entry={entry} />
        </div>
        <div className="detail-panel-name">{entry.name}</div>

        <div className="detail-divider" />

        <div className="detail-row">
          <label>경로</label>
          <span className="value" style={{ userSelect: 'text' }}>
            {fullPath}
          </span>
        </div>

        <div className="detail-row">
          <label>유형</label>
          <span className="value">
            {entry.isFolder ? '폴더' : (entry.mimetype ?? '알 수 없음')}
          </span>
        </div>

        <div className="detail-row">
          <label>크기</label>
          <span className="value">{entry.isFolder ? '—' : formatSize(entry.size)}</span>
        </div>

        <div className="detail-row">
          <label>수정</label>
          <span className="value">
            {entry.isFolder ? '—' : formatDate(entry.lastModified)}
          </span>
        </div>

        {!entry.isFolder && (
          <>
            <div className="detail-divider" />
            <button
              className="btn btn-primary btn-sm btn-full"
              onClick={() => void handleCopyUrl()}
              disabled={copying}
            >
              {copying ? '처리 중…' : 'URL 복사'}
            </button>
          </>
        )}

        {toast && <div className="detail-toast">URL이 복사되었습니다.</div>}
      </div>
    </aside>
  );
}
