import { useState } from 'react';
import { X } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';
import { renameItem, renameFolder, joinPath, type StorageEntry } from '../lib/storage';

type Props = {
  open: boolean;
  bucket: string;
  currentPath: string;
  entry: StorageEntry;
  onClose: () => void;
  onRenamed: () => void;
};

export function RenameDialog({ open, bucket, currentPath, entry, onClose, onRenamed }: Props) {
  const [newName, setNewName] = useState(entry.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('이름을 입력하세요.');
      return;
    }
    if (/[/\\]/.test(trimmed)) {
      setError('이름에 / 또는 \\ 사용 불가.');
      return;
    }
    if (trimmed === entry.name) {
      onClose();
      return;
    }
    const client = getSupabase();
    if (!client) {
      setError('Supabase 설정이 필요합니다.');
      return;
    }

    const parentDir = currentPath.split('/').slice(0, -1).join('/');
    const newPath = joinPath(parentDir, trimmed);

    setSaving(true);
    setError(null);
    setProgress(null);

    try {
      if (entry.isFolder) {
        await renameFolder(client, bucket, currentPath, newPath, (done, total) => {
          setProgress(`${done}/${total} 파일 이동 중…`);
        });
      } else {
        await renameItem(client, bucket, currentPath, newPath);
      }
      onRenamed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !saving) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">이름 바꾸기</h2>
          <button className="btn-icon" onClick={onClose} disabled={saving} aria-label="닫기">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="rename-input">새 이름</label>
              <input
                id="rename-input"
                className="text-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                disabled={saving}
              />
            </div>
            {error && <div className="form-error">{error}</div>}
            {progress && <div className="form-success">{progress}</div>}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
