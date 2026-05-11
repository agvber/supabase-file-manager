import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { FileTable } from '../components/FileTable';
import { UploadDropzone } from '../components/UploadDropzone';
import { NewFolderDialog } from '../components/NewFolderDialog';
import { RenameDialog } from '../components/RenameDialog';
import { BulkActionBar } from '../components/BulkActionBar';
import { MoveDialog } from '../components/MoveDialog';
import { useFiles } from '../hooks/useFiles';
import { useSelection } from '../hooks/useSelection';
import { getSupabase } from '../lib/supabaseClient';
import {
  removeFiles,
  removeFolder,
  removeMany,
  moveMany,
  copyMany,
  createSignedDownloadUrl,
  joinPath,
  type StorageEntry,
} from '../lib/storage';

export function FileManagerPage() {
  const { bucket } = useParams<{ bucket: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive current folder path from URL splat
  const splat = location.pathname.replace(new RegExp(`^/b/${bucket}/?`), '');
  const path = splat.replace(/\/$/, '');

  const { folders, files, loading, error, refresh } = useFiles(bucket ?? '', path);
  const sel = useSelection();

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<StorageEntry | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveMode, setMoveMode] = useState<'move' | 'copy'>('move');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Clear selection on navigation
  useEffect(() => {
    sel.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, path]);

  // Build a map from entry name -> isFolder for current listing
  function buildEntryMap(): Map<string, boolean> {
    const map = new Map<string, boolean>();
    for (const e of folders) map.set(e.name, true);
    for (const e of files) map.set(e.name, false);
    return map;
  }

  // selected stores entry names; resolve to full paths with isFolder flag
  function resolveSelected(): { path: string; name: string; isFolder: boolean }[] {
    const map = buildEntryMap();
    return Array.from(sel.selected)
      .filter((name) => map.has(name))
      .map((name) => ({
        name,
        path: path ? joinPath(path, name) : name,
        isFolder: map.get(name) ?? false,
      }));
  }

  async function handleDelete(entry: StorageEntry) {
    const label = entry.isFolder ? `폴더 "${entry.name}"` : `파일 "${entry.name}"`;
    const confirmed = window.confirm(
      `정말 삭제할까요?\n${label}${entry.isFolder ? '\n(하위 파일 포함 전체 삭제)' : ''}`,
    );
    if (!confirmed) return;

    const client = getSupabase();
    if (!client) return;

    const fullPath = path ? joinPath(path, entry.name) : entry.name;
    try {
      if (entry.isFolder) {
        await removeFolder(client, bucket ?? '', fullPath);
      } else {
        await removeFiles(client, bucket ?? '', [fullPath]);
      }
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDownload(entry: StorageEntry) {
    if (entry.isFolder) return;
    const client = getSupabase();
    if (!client) return;
    const fullPath = path ? joinPath(path, entry.name) : entry.name;
    try {
      const url = await createSignedDownloadUrl(client, bucket ?? '', fullPath, entry.name);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleBulkDelete() {
    const items = resolveSelected();
    if (items.length === 0) return;
    const confirmed = window.confirm(
      `선택한 ${items.length}개 항목을 정말 삭제할까요?\n(폴더는 하위 파일 포함 전체 삭제)`,
    );
    if (!confirmed) return;
    const client = getSupabase();
    if (!client) return;
    setBusy(true);
    setProgress(null);
    try {
      await removeMany(
        client,
        bucket ?? '',
        items.map((it) => ({ path: it.path, isFolder: it.isFolder })),
        (done, total) => setProgress({ done, total }),
      );
      sel.clear();
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function handleBulkMove() {
    setMoveMode('move');
    setMoveDialogOpen(true);
  }

  function handleBulkCopy() {
    setMoveMode('copy');
    setMoveDialogOpen(true);
  }

  async function handleMoveConfirm(targetPath: string) {
    const items = resolveSelected();
    if (items.length === 0) return;
    const client = getSupabase();
    if (!client) return;
    setBusy(true);
    setProgress(null);
    setMoveDialogOpen(false);
    try {
      const opItems = items.map((it) => ({
        from: it.path,
        to: joinPath(targetPath, it.name),
        isFolder: it.isFolder,
      }));
      if (moveMode === 'move') {
        await moveMany(client, bucket ?? '', opItems, (done, total) =>
          setProgress({ done, total }),
        );
      } else {
        await copyMany(client, bucket ?? '', opItems, (done, total) =>
          setProgress({ done, total }),
        );
      }
      sel.clear();
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  // Selection toggle helpers for FileTable
  const allEntryNames = [...folders, ...files].map((e) => e.name);
  const allSelected =
    allEntryNames.length > 0 && allEntryNames.every((n) => sel.isSelected(n));
  const someSelected = allEntryNames.some((n) => sel.isSelected(n));

  function handleToggleAll() {
    if (allSelected) {
      sel.clear();
    } else {
      sel.setAll(allEntryNames);
    }
  }

  // Exclude paths: selected folder full paths (can't move/copy into themselves)
  const excludePaths = resolveSelected()
    .filter((it) => it.isFolder)
    .map((it) => it.path);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">파일 매니저</h1>
        <div className="dashboard-header-right">
          <button onClick={() => navigate('/')} className="header-link">
            버킷 목록
          </button>
          <Link to="/settings" className="header-link">
            설정
          </Link>
        </div>
      </header>

      <main className="dashboard-main">
        <Breadcrumb bucket={bucket ?? ''} path={path} />

        <div className="fm-toolbar">
          <button className="btn btn-sm" onClick={() => setNewFolderOpen(true)}>
            📁 폴더 만들기
          </button>
          <button className="btn btn-sm" onClick={refresh}>
            새로고침
          </button>
        </div>

        <UploadDropzone bucket={bucket ?? ''} path={path} onUploaded={refresh} />

        {error && <div className="form-error">{error}</div>}

        {loading ? (
          <div className="file-list-status">불러오는 중…</div>
        ) : (
          <FileTable
            bucket={bucket ?? ''}
            path={path}
            folders={folders}
            files={files}
            onFolderClick={(name) =>
              navigate(`/b/${bucket}/${joinPath(path, name)}`)
            }
            onRename={(entry) => setRenameTarget(entry)}
            onDelete={handleDelete}
            onDownload={handleDownload}
            isSelected={sel.isSelected}
            onToggleSelect={sel.toggle}
            onToggleAll={handleToggleAll}
            allSelected={allSelected}
            someSelected={someSelected}
          />
        )}
      </main>

      <BulkActionBar
        count={sel.count}
        onDelete={handleBulkDelete}
        onMove={handleBulkMove}
        onCopy={handleBulkCopy}
        onClear={sel.clear}
        busy={busy}
        progress={progress}
      />

      <NewFolderDialog
        open={newFolderOpen}
        bucket={bucket ?? ''}
        path={path}
        onClose={() => setNewFolderOpen(false)}
        onCreated={refresh}
      />

      {renameTarget && (
        <RenameDialog
          open
          bucket={bucket ?? ''}
          currentPath={path ? joinPath(path, renameTarget.name) : renameTarget.name}
          entry={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRenamed={() => {
            setRenameTarget(null);
            refresh();
          }}
        />
      )}

      <MoveDialog
        open={moveDialogOpen}
        bucket={bucket ?? ''}
        excludePaths={excludePaths}
        mode={moveMode}
        onClose={() => setMoveDialogOpen(false)}
        onConfirm={handleMoveConfirm}
      />
    </div>
  );
}
