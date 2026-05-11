import type { SupabaseClient } from '@supabase/supabase-js';
import type { FileObject } from '@supabase/storage-js';

export type BucketInfo = {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
  updated_at: string;
};

export async function listBuckets(client: SupabaseClient): Promise<BucketInfo[]> {
  const { data, error } = await client.storage.listBuckets();
  if (error) throw new Error(error.message);
  return (data ?? []) as BucketInfo[];
}

export type StorageEntry = {
  name: string;
  isFolder: boolean;
  size: number | null;
  mimetype: string | null;
  lastModified: string | null; // ISO
  createdAt: string | null;
  raw: FileObject;
};

export const FOLDER_PLACEHOLDER = '.emptyFolderPlaceholder';

export async function listFolder(
  client: SupabaseClient,
  bucket: string,
  path: string,
): Promise<StorageEntry[]> {
  const prefix = path.replace(/^\/+|\/+$/g, '');
  const { data, error } = await client.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw new Error(error.message);
  const items = (data ?? []).filter((f) => f.name !== FOLDER_PLACEHOLDER);
  return items.map(toEntry);
}

function toEntry(f: FileObject): StorageEntry {
  const isFolder = f.metadata == null || f.id == null;
  const size = (f.metadata?.size as number | undefined) ?? null;
  const mimetype = (f.metadata?.mimetype as string | undefined) ?? null;
  return {
    name: f.name,
    isFolder,
    size,
    mimetype,
    lastModified: f.updated_at ?? null,
    createdAt: f.created_at ?? null,
    raw: f,
  };
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export async function createFolder(
  client: SupabaseClient,
  bucket: string,
  parentPath: string,
  folderName: string,
): Promise<void> {
  const trimmed = folderName.trim();
  if (!trimmed || /[/\\]/.test(trimmed))
    throw new Error('폴더 이름에 / 또는 \\ 사용 불가.');
  const fullPath = joinPath(parentPath, trimmed, FOLDER_PLACEHOLDER);
  const { error } = await client.storage
    .from(bucket)
    .upload(fullPath, new Blob([''], { type: 'application/octet-stream' }), { upsert: false });
  if (error) throw new Error(error.message);
}

export async function renameItem(
  client: SupabaseClient,
  bucket: string,
  fromPath: string,
  toPath: string,
): Promise<void> {
  const { error } = await client.storage.from(bucket).move(fromPath, toPath);
  if (error) throw new Error(error.message);
}

export async function removeFiles(
  client: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await client.storage.from(bucket).remove(paths);
  if (error) throw new Error(error.message);
}

// Recursive: list all objects under prefix and remove them.
export async function removeFolder(
  client: SupabaseClient,
  bucket: string,
  folderPath: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const all = await collectAllObjects(client, bucket, folderPath);
  if (all.length === 0) return;
  const batchSize = 100;
  let done = 0;
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize);
    const { error } = await client.storage.from(bucket).remove(batch);
    if (error) throw new Error(error.message);
    done += batch.length;
    onProgress?.(done, all.length);
  }
}

async function collectAllObjects(
  client: SupabaseClient,
  bucket: string,
  prefix: string,
  acc: string[] = [],
): Promise<string[]> {
  const cleaned = prefix.replace(/^\/+|\/+$/g, '');
  const { data, error } = await client.storage.from(bucket).list(cleaned, { limit: 1000 });
  if (error) throw new Error(error.message);
  for (const entry of data ?? []) {
    const fullPath = joinPath(cleaned, entry.name);
    const isFolder = entry.metadata == null || entry.id == null;
    if (isFolder) {
      await collectAllObjects(client, bucket, fullPath, acc);
    } else {
      acc.push(fullPath);
    }
  }
  // Include the placeholder itself if present
  const placeholderPath = joinPath(cleaned, FOLDER_PLACEHOLDER);
  if (!acc.includes(placeholderPath)) {
    const { data: probe } = await client.storage
      .from(bucket)
      .list(cleaned, { search: FOLDER_PLACEHOLDER, limit: 1 });
    if (probe && probe.some((f) => f.name === FOLDER_PLACEHOLDER)) {
      acc.push(placeholderPath);
    }
  }
  return acc;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function renameFolder(
  client: SupabaseClient,
  bucket: string,
  fromPath: string,
  toPath: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const all = await collectAllObjects(client, bucket, fromPath);
  let done = 0;
  for (const old of all) {
    const newObjPath = old.replace(
      new RegExp(`^${escapeRegExp(fromPath)}(/|$)`),
      toPath + '$1',
    );
    const { error } = await client.storage.from(bucket).move(old, newObjPath);
    if (error) throw new Error(error.message);
    done++;
    onProgress?.(done, all.length);
  }
}

export async function createSignedDownloadUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  filename?: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, 3600, { download: filename ?? true });
  if (error || !data?.signedUrl)
    throw new Error(error?.message ?? '다운로드 URL 생성 실패');
  return data.signedUrl;
}
