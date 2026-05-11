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
}: Props) {
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
            return (
              <tr
                key={entry.name}
                className={`folder-row${sel ? ' row-selected' : ''}`}
                onClick={() => onFolderClick(entry.name)}
                title={entry.name}
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
