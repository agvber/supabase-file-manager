import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { listAllFolders, type FolderNode } from '../lib/storage';

type Props = {
  open: boolean;
  bucket: string;
  excludePaths: string[];
  mode: 'move' | 'copy';
  onClose: () => void;
  onConfirm: (targetPath: string) => void | Promise<void>;
};

function isDescendantOrSelf(candidate: string, excludePaths: string[]): boolean {
  for (const ex of excludePaths) {
    if (candidate === ex) return true;
    if (candidate.startsWith(ex + '/')) return true;
  }
  return false;
}

function renderNodes(
  nodes: FolderNode[],
  depth: number,
  excludePaths: string[],
  selected: string | null,
  onSelect: (path: string) => void,
): React.ReactNode {
  return nodes.map((node) => {
    if (isDescendantOrSelf(node.path, excludePaths)) return null;
    const isSel = selected === node.path;
    return (
      <div
        key={node.path}
        className={`folder-tree-node${isSel ? ' selected' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => onSelect(node.path)}
      >
        📁 {node.name}
        {node.children.length > 0 &&
          renderNodes(node.children, depth + 1, excludePaths, selected, onSelect)}
      </div>
    );
  });
}

export function MoveDialog({ open, bucket, excludePaths, mode, onClose, onConfirm }: Props) {
  const [tree, setTree] = useState<FolderNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setTree(null);
      setError(null);
      return;
    }
    const client = getSupabase();
    if (!client) {
      setError('Supabase 설정이 필요합니다.');
      return;
    }
    setLoading(true);
    setError(null);
    listAllFolders(client, bucket)
      .then((root) => {
        setTree(root);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [open, bucket]);

  if (!open) return null;

  const title = mode === 'move' ? '이동할 위치 선택' : '복사할 위치 선택';
  const confirmLabel = mode === 'move' ? '여기로 이동' : '여기로 복사';

  async function handleConfirm() {
    if (selected === null) return;
    setConfirming(true);
    try {
      await onConfirm(selected);
    } finally {
      setConfirming(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !confirming) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <h2 className="modal-title">{title}</h2>
        {error && <div className="form-error">{error}</div>}
        {loading ? (
          <div style={{ padding: '16px 0', color: '#6b7280', fontSize: 13 }}>
            폴더 목록 불러오는 중…
          </div>
        ) : (
          <div className="folder-tree">
            {tree && (
              <>
                {/* Root node */}
                {!isDescendantOrSelf('', excludePaths) && (
                  <div
                    className={`folder-tree-node${selected === '' ? ' selected' : ''}`}
                    style={{ paddingLeft: 8 }}
                    onClick={() => setSelected('')}
                  >
                    📁 {tree.name}
                  </div>
                )}
                {renderNodes(tree.children, 1, excludePaths, selected, setSelected)}
              </>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={confirming}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={selected === null || confirming || loading}
          >
            {confirming ? '처리 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
