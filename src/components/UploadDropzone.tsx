import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadResumable } from '../lib/upload';
import { getConfig } from '../lib/config';
import { joinPath } from '../lib/storage';

type Props = {
  bucket: string;
  path: string;
  onUploaded: () => void;
  externalFiles?: FileList | null;
  onExternalFilesConsumed?: () => void;
};

type FileStatus = {
  name: string;
  progress: number;
  done: boolean;
  error: string | null;
};

const CONCURRENCY = 4;

function friendlyUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/failed to resume upload/i.test(msg)) {
    return '이전 업로드 캐시 충돌. 페이지를 새로고침하고 다시 시도해주세요.';
  }
  const codeMatch = msg.match(/response code:\s*(\d+)/i);
  if (codeMatch) {
    const code = codeMatch[1];
    if (code === '413') return '파일이 너무 큽니다. 버킷 file_size_limit을 확인하세요.';
    if (code === '401') return 'Auth key가 유효하지 않습니다. 설정을 다시 확인하세요.';
    if (code === '403') return 'RLS 정책으로 차단됨. service_role 또는 권한 있는 Auth key가 필요합니다.';
    if (code === '404') return '버킷 또는 경로를 찾을 수 없습니다.';
    return `서버 응답 오류 (HTTP ${code}).`;
  }
  if (/network|fetch|cors/i.test(msg)) {
    return '네트워크 오류. Supabase URL과 CORS 설정을 확인하세요.';
  }
  return msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
}

export function UploadDropzone({
  bucket,
  path,
  onUploaded,
  externalFiles,
  onExternalFilesConsumed,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      void uploadFiles(externalFiles);
      onExternalFilesConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalFiles]);

  function updateStatus(name: string, patch: Partial<FileStatus>) {
    setStatuses((prev) =>
      prev.map((s) => (s.name === name ? { ...s, ...patch } : s)),
    );
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const config = getConfig();
    if (!config) return;

    const initial: FileStatus[] = files.map((f) => ({
      name: f.name,
      progress: 0,
      done: false,
      error: null,
    }));
    setStatuses(initial);
    setUploading(true);

    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const chunk = files.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map((file) => {
          const objectPath = path ? joinPath(path, file.name) : file.name;
          const { promise } = uploadResumable({
            supabaseUrl: config.url,
            accessToken: config.authKey,
            bucket,
            objectPath,
            file,
            contentType: file.type || 'application/octet-stream',
            upsert: true,
            onProgress(loaded, total) {
              const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
              updateStatus(file.name, { progress: pct });
            },
          });
          return promise
            .then(() => updateStatus(file.name, { done: true, progress: 100 }))
            .catch((err) =>
              updateStatus(file.name, {
                error: friendlyUploadError(err),
              }),
            );
        }),
      );
    }

    setUploading(false);
    onUploaded();
  }

  function handleClick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void uploadFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void uploadFiles(e.dataTransfer.files);
    }
  }

  const doneCount = statuses.filter((s) => s.done).length;
  const totalCount = statuses.length;

  return (
    <div className="dropzone-wrapper">
      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label="파일 업로드 영역"
      >
        <Upload size={18} className="dropzone-icon" strokeWidth={1.75} />
        <span>파일을 드래그하거나 클릭해 업로드</span>
        <span className="dropzone-hint">같은 이름은 덮어쓰기됩니다.</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {statuses.length > 0 && (
        <div className="upload-status-list">
          {uploading && (
            <div className="upload-overall">
              업로드 중: {doneCount}/{totalCount}
            </div>
          )}
          {statuses.map((s) => (
            <div key={s.name} className="upload-status-item">
              <span className="upload-status-name">{s.name}</span>
              {s.error ? (
                <span className="upload-status-error">{s.error}</span>
              ) : s.done ? (
                <span className="upload-status-done">완료</span>
              ) : (
                <span className="upload-status-pct">{s.progress}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
