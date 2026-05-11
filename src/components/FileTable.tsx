import { useState } from 'react';
import type { StorageEntry } from '../lib/storage';

type Props = {
  bucket: string;
  path: string;
  folders: StorageEntry[];
  files: StorageEntry[];
  onFolderClick: (name: string) => void;
  onRename: (entry: StorageEntry) => void;
  onDelete: (entry: StorageEntry) => void;
  onDownload: (entry: StorageEntry) => void;
  isSelected: (path: string) => boolean;
  onToggleSelect: (path: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
  onDropOnFolder?: (sourceNames: string[], targetFolderName: string) => Promise<void>;
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

export function FileTable({
  folders,
  files,
  onFolderClick,
  onRename,
  onDelete,
  onDownload,
  isSelected,
  onToggleSelect,
  onToggleAll,
  allSelected,
  someSelected,
  onDropOnFolder,
}: Props) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent<HTMLTableRowElement>, entry: StorageEntry) {
    // Build list of sources: if dragged entry is selected, drag all selected; else just this one
    const sources: string[] = isSelected(entry.name)
      ? [...Array.from(
          // Collect all selected names from both folders and files
          new Set([
            ...folders.filter((f) => isSelected(f.name)).map((f) => f.name),
            ...files.filter((f) => isSelected(f.name)).map((f) => f.name),
          ])
        )]
      : [entry.name];
    e.dataTransfer.setData('application/x-fm-item', JSON.stringify({ items: sources }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleFolderDragOver(e: React.DragEvent<HTMLTableRowElement>, folderName: string) {
    if (e.dataTransfer.types.includes('application/x-fm-item')) {
      e.preventDefault();
      setDropTarget(folderName);
    }
  }

  function handleFolderDragLeave(e: React.DragEvent<HTMLTableRowElement>) {
    // Only clear if leaving to outside the row
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }

  async function handleFolderDrop(e: React.DragEvent<HTMLTableRowElement>, folderEntry: StorageEntry) {
    e.preventDefault();
    setDropTarget(null);
    const raw = e.dataTransfer.getData('application/x-fm-item');
    if (!raw || !onDropOnFolder) return;
    try {
      const { items }: { items: string[] } = JSON.parse(raw) as { items: string[] };
      // Filter out self-move (can't drop folder onto itself)
      const filtered = items.filter((name) => name !== folderEntry.name);
      if (filtered.length === 0) return;
      await onDropOnFolder(filtered, folderEntry.name);
    } catch {
      // ignore parse errors
    }
  }

  const isEmpty = folders.length === 0 && files.length === 0;

  if (isEmpty) {
    return (
      <div className="file-list">
        <div className="file-list-empty">
          이 폴더가 비어있습니다. 파일을 업로드하거나 폴더를 만들어보세요.
        </div>
      </div>
    );
  }

  return (
    <div className="file-list">
      <table className="file-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={onToggleAll}
                aria-label="전체 선택"
              />
            </th>
            <th>이름</th>
            <th>크기</th>
            <th>수정일</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {folders.map((entry) => {
            const sel = isSelected(entry.name);
            const isDropTarget = dropTarget === entry.name;
            return (
              <tr
                key={entry.name}
                className={`folder-row${sel ? ' row-selected' : ''}${isDropTarget ? ' drop-target' : ''}`}
                onClick={() => onFolderClick(entry.name)}
                title={entry.name}
                draggable
                onDragStart={(e) => handleDragStart(e, entry)}
                onDragOver={(e) => handleFolderDragOver(e, entry.name)}
                onDragLeave={handleFolderDragLeave}
                onDrop={(e) => void handleFolderDrop(e, entry)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => onToggleSelect(entry.name)}
                    aria-label={`${entry.name} 선택`}
                  />
                </td>
                <td>📁 {entry.name}</td>
                <td>—</td>
                <td>{formatDate(entry.lastModified)}</td>
                <td>
                  <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-sm"
                      onClick={() => onRename(entry)}
                    >
                      이름 바꾸기
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => onDelete(entry)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {files.map((entry) => {
            const sel = isSelected(entry.name);
            return (
              <tr
                key={entry.name}
                className={sel ? 'row-selected' : undefined}
                title={entry.name}
                draggable
                onDragStart={(e) => handleDragStart(e, entry)}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => onToggleSelect(entry.name)}
                    aria-label={`${entry.name} 선택`}
                  />
                </td>
                <td>📄 {entry.name}</td>
                <td>{formatSize(entry.size)}</td>
                <td>{formatDate(entry.lastModified)}</td>
                <td>
                  <div className="file-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => onDownload(entry)}
                    >
                      다운로드
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => onRename(entry)}
                    >
                      이름 바꾸기
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => onDelete(entry)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
