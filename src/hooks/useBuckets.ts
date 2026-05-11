import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { listBuckets, type BucketInfo } from '../lib/storage';

export function useBuckets() {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setBuckets([]);
      setLoading(false);
      setError('Supabase 설정이 필요합니다.');
      return;
    }
    setLoading(true);
    setError(null);
    listBuckets(client)
      .then((list) => {
        setBuckets(list);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [tick]);

  return { buckets, loading, error, refresh };
}
