import { useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { createFolder } from '../lib/storage';

type Props = {
  open: boolean;
  bucket: string;
  path: string;
  onClose: () => void;
  onCreated: () => void;
};

export function NewFolderDialog({ open, bucket, path, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('폴더 이름을 입력하세요.');
      return;
    }
    if (/[/\\]/.test(trimmed)) {
      setError('폴더 이름에 / 또는 \\ 사용 불가.');
      return;
    }
    const client = getSupabase();
    if (!client) {
      setError('Supabase 설정이 필요합니다.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createFolder(client, bucket, path, trimmed);
      setName('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card">
        <h2 className="modal-title">새 폴더 만들기</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="new-folder-name">폴더 이름</label>
            <input
              id="new-folder-name"
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={saving}
              placeholder="예: 2024-photos"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={saving}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
