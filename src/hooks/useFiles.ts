import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSessionExpired } from '../lib/supabaseClient';
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
    // 만료된 세션은 supabase-js가 조용히 anon key로 fallback해 빈 목록만 보이므로 선체크
    isSessionExpired()
      .then((expired) => {
        if (expired) {
          throw new Error('로그인 세션이 만료되었습니다. 설정에서 다시 로그인해주세요.');
        }
        return listFolder(client, bucket, path);
      })
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
