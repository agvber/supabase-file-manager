import { useState } from 'react';
import { Folder, File, Image, FileText, Download, Pencil, Trash2 } from 'lucide-react';
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

function FileEntryIcon({ entry }: { entry: StorageEntry }) {
  if (entry.isFolder) {
    return <Folder size={15} className="file-name-icon file-name-icon--folder" strokeWidth={1.75} />;
  }
  const mime = entry.mimetype ?? '';
  if (mime.startsWith('image/')) {
    return <Image size={15} className="file-name-icon" strokeWidth={1.75} />;
  }
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml')) {
    return <FileText size={15} className="file-name-icon" strokeWidth={1.75} />;
  }
  return <File size={15} className="file-name-icon" strokeWidth={1.75} />;
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
    const sources: string[] = isSelected(entry.name)
      ? [
          ...Array.from(
            new Set([
              ...folders.filter((f) => isSelected(f.name)).map((f) => f.name),
              ...files.filter((f) => isSelected(f.name)).map((f) => f.name),
            ]),
          ),
        ]
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
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }

  async function handleFolderDrop(
    e: React.DragEvent<HTMLTableRowElement>,
    folderEntry: StorageEntry,
  ) {
    e.preventDefault();
    setDropTarget(null);
    const raw = e.dataTransfer.getData('application/x-fm-item');
    if (!raw || !onDropOnFolder) return;
    try {
      const { items }: { items: string[] } = JSON.parse(raw) as { items: string[] };
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
          <Folder size={32} className="file-list-empty-icon" strokeWidth={1.25} />
          <span className="file-list-empty-text">
            이 폴더가 비어있습니다. 파일을 업로드하거나 폴더를 만들어보세요.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list">
      <table className="file-table">
        <thead>
          <tr>
            <th>
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
            <th style={{ width: 100 }}>크기</th>
            <th style={{ width: 180 }}>수정일</th>
            <th style={{ width: 120 }}></th>
          </tr>
        </thead>
        <tbody>
          {folders.map((entry) => {
            const selected = isSelected(entry.name);
            const isDropTarget = dropTarget === entry.name;
            return (
              <tr
                key={entry.name}
                className={`folder-row${selected ? ' row-selected' : ''}${isDropTarget ? ' drop-target' : ''}`}
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
                    checked={selected}
                    onChange={() => onToggleSelect(entry.name)}
                    aria-label={`${entry.name} 선택`}
                  />
                </td>
                <td>
                  <div className="file-name-cell">
                    <FileEntryIcon entry={entry} />
                    <span className="file-name-text">{entry.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {formatDate(entry.lastModified)}
                </td>
                <td>
                  <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-icon"
                      onClick={() => onRename(entry)}
                      title="이름 바꾸기"
                      aria-label="이름 바꾸기"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => onDelete(entry)}
                      title="삭제"
                      aria-label="삭제"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {files.map((entry) => {
            const selected = isSelected(entry.name);
            return (
              <tr
                key={entry.name}
                className={selected ? 'row-selected' : undefined}
                title={entry.name}
                draggable
                onDragStart={(e) => handleDragStart(e, entry)}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(entry.name)}
                    aria-label={`${entry.name} 선택`}
                  />
                </td>
                <td>
                  <div className="file-name-cell">
                    <FileEntryIcon entry={entry} />
                    <span className="file-name-text">{entry.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {formatSize(entry.size)}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {formatDate(entry.lastModified)}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn-icon"
                      onClick={() => onDownload(entry)}
                      title="다운로드"
                      aria-label="다운로드"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => onRename(entry)}
                      title="이름 바꾸기"
                      aria-label="이름 바꾸기"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => onDelete(entry)}
                      title="삭제"
                      aria-label="삭제"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
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
