import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { listFolder, type StorageEntry } from '../lib/storage';

export function useFiles(bucket: string, path: string) {
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setEntries([]);
      setError('Supabase 설정이 필요합니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listFolder(client, bucket, path)
      .then((list) => {
        setEntries(list);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [bucket, path, tick]);

  const folders = entries.filter((e) => e.isFolder);
  const files = entries.filter((e) => !e.isFolder);

  return { entries, folders, files, loading, error, refresh };
}
