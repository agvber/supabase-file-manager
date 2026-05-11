import { Trash2, FolderInput, Copy, X } from 'lucide-react';

type Props = {
  count: number;
  onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
  onClear: () => void;
  busy?: boolean;
  progress?: { done: number; total: number } | null;
};

export function BulkActionBar({
  count,
  onDelete,
  onMove,
  onCopy,
  onClear,
  busy = false,
  progress,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="bulk-action-bar">
      <span className="count">선택 {count}개</span>
      {busy && progress ? (
        <span className="progress-text">
          처리 중 {progress.done}/{progress.total}
        </span>
      ) : null}
      <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={busy}>
        <Trash2 size={13} />
        삭제
      </button>
      <button className="btn btn-sm" onClick={onMove} disabled={busy}>
        <FolderInput size={13} />
        이동
      </button>
      <button className="btn btn-sm" onClick={onCopy} disabled={busy}>
        <Copy size={13} />
        복사
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onClear} disabled={busy}>
        <X size={13} />
        선택 해제
      </button>
    </div>
  );
}
