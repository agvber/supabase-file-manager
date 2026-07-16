import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSessionExpired } from '../lib/supabaseClient';
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
    // 만료된 세션은 supabase-js가 조용히 anon key로 fallback해 빈 목록만 보이므로 선체크
    isSessionExpired()
      .then((expired) => {
        if (expired) {
          throw new Error('로그인 세션이 만료되었습니다. 설정에서 다시 로그인해주세요.');
        }
        return listBuckets(client);
      })
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
