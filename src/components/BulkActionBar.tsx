type Props = {
  count: number;
  onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
  onClear: () => void;
  busy?: boolean;
  progress?: { done: number; total: number } | null;
};

export function BulkActionBar({ count, onDelete, onMove, onCopy, onClear, busy = false, progress }: Props) {
  if (count === 0) return null;

  return (
    <div className="bulk-action-bar">
      <span className="count">선택 {count}개</span>
      {busy && progress ? (
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          처리 중 {progress.done}/{progress.total}
        </span>
      ) : null}
      <button className="btn btn-sm btn-danger" onClick={onDelete} disabled={busy}>
        삭제
      </button>
      <button className="btn btn-sm" onClick={onMove} disabled={busy}>
        이동
      </button>
      <button className="btn btn-sm" onClick={onCopy} disabled={busy}>
        복사
      </button>
      <button className="btn btn-sm" onClick={onClear} disabled={busy}>
        선택 해제
      </button>
    </div>
  );
}
