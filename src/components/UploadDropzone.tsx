import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { getConfig } from '../lib/config';
import { getSupabase, isSessionExpired } from '../lib/supabaseClient';
import { joinPath, uploadFile } from '../lib/storage';

type Props = {
  bucket: string;
  path: string;
  onUploaded: () => void;
  externalFiles?: FileList | null;
  onExternalFilesConsumed?: () => void;
};

type UploadState = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

type FileStatus = {
  name: string;
  state: UploadState;
  error: string | null;
};

const CONCURRENCY = 4;

function friendlyUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const passwordMode = getConfig()?.loginType === 'password';
  // supabase-js StorageApiError의 숫자 status (런타임 import 없이 duck-typing으로 읽음)
  const status =
    err && typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : null;
  // RLS 차단은 storage-api 버전에 따라 403 또는 400 + row-level security 메시지로 온다
  if (status === 403 || /row-level security/i.test(msg)) {
    return passwordMode
      ? 'RLS 정책으로 차단됨. 이 계정에 업로드 권한이 있는지 확인하세요.'
      : 'RLS 정책으로 차단됨. service_role 또는 권한 있는 Auth key가 필요합니다.';
  }
  if (status === 413 || /exceeded the maximum allowed size|payload too large/i.test(msg)) {
    return '파일이 너무 큽니다. 버킷 file_size_limit을 확인하세요.';
  }
  if (status === 401) {
    return passwordMode
      ? '로그인 세션이 만료되었습니다. 설정에서 다시 로그인해주세요.'
      : 'Auth key가 유효하지 않습니다. 설정을 다시 확인하세요.';
  }
  if (status === 404) return '버킷 또는 경로를 찾을 수 없습니다.';
  if (status === 409) return '같은 이름의 파일이 이미 존재합니다.';
  if (status !== null) return `서버 응답 오류 (HTTP ${status}).`;
  // Safari는 네트워크 실패 시 "Load failed" 메시지를 쓴다
  if (/network|fetch|load failed|cors|timed? ?out|abort/i.test(msg)) {
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
  // 업로드가 시작된(더는 취소 불가) 파일명과 대기 중 취소된 파일명 집합
  const startedRef = useRef<Set<string>>(new Set());
  const canceledRef = useRef<Set<string>>(new Set());

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

  // supabase-js upload()는 진행 중 요청을 중단할 수단이 없어 대기 중인 파일만 취소한다.
  // 배치 루프가 첫 await 전에 동기적으로 startedRef에 넣으므로 클릭과 경합하지 않는다.
  function cancelUpload(name: string) {
    if (startedRef.current.has(name)) return;
    canceledRef.current.add(name);
    updateStatus(name, { state: 'canceled' });
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const client = getSupabase();
    if (!client) return;

    const initial: FileStatus[] = files.map((f) => ({
      name: f.name,
      state: 'queued',
      error: null,
    }));
    setStatuses(initial);
    setUploading(true);
    startedRef.current.clear();
    canceledRef.current.clear();

    // supabase-js는 세션이 없으면 조용히 anon key로 fallback하므로 선체크해 재로그인을 안내.
    // 배치가 JWT 수명(~1h)을 넘기면 autoRefreshToken이 갱신하며, 갱신 실패 시
    // 이후 파일은 401 또는 RLS 오류로 표면화된다(허용 edge).
    if (await isSessionExpired()) {
      setStatuses(
        initial.map(
          (s): FileStatus => ({
            ...s,
            state: 'error',
            error: '로그인 세션이 만료되었습니다. 설정에서 다시 로그인해주세요.',
          }),
        ),
      );
      setUploading(false);
      return;
    }

    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const chunk = files.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (file) => {
          if (canceledRef.current.has(file.name)) return;
          startedRef.current.add(file.name);
          updateStatus(file.name, { state: 'uploading' });
          const objectPath = path ? joinPath(path, file.name) : file.name;
          try {
            await uploadFile(client, bucket, objectPath, file);
            updateStatus(file.name, { state: 'done' });
          } catch (err) {
            updateStatus(file.name, { state: 'error', error: friendlyUploadError(err) });
          }
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

  const doneCount = statuses.filter((s) => s.state === 'done').length;
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
            <div key={s.name} className={`upload-status-item state-${s.state}`}>
              <div className="upload-status-row">
                <span className="upload-status-name">{s.name}</span>
                {s.state === 'error' ? (
                  <span className="upload-status-error">{s.error}</span>
                ) : s.state === 'canceled' ? (
                  <span className="upload-status-canceled">취소됨</span>
                ) : s.state === 'done' ? (
                  <span className="upload-status-done">완료</span>
                ) : s.state === 'uploading' ? (
                  <>
                    <span className="spinner" aria-hidden />
                    <span className="upload-status-uploading">업로드 중</span>
                  </>
                ) : (
                  <>
                    <span className="upload-status-queued">대기 중</span>
                    <button
                      type="button"
                      className="upload-cancel-btn"
                      onClick={() => cancelUpload(s.name)}
                      aria-label={`${s.name} 업로드 취소`}
                      title="업로드 취소"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
