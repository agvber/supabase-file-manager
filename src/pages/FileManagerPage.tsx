import { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { FileTable } from '../components/FileTable';
import { UploadDropzone } from '../components/UploadDropzone';
import { NewFolderDialog } from '../components/NewFolderDialog';
import { RenameDialog } from '../components/RenameDialog';
import { useFiles } from '../hooks/useFiles';
import { getSupabase } from '../lib/supabaseClient';
import {
  removeFiles,
  removeFolder,
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

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<StorageEntry | null>(null);

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
          />
        )}
      </main>

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
    </div>
  );
}
