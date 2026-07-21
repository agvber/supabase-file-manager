import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSessionExpired } from '../lib/supabaseClient';
import { listBuckets, type BucketInfo } from '../lib/storage';
import { getConfig } from '../lib/config';
import {
  addManualBucket,
  getManualBuckets,
  removeManualBucket,
} from '../lib/manualBuckets';

// 사이드바에 표시되는 버킷: listBuckets 결과 + 사용자가 직접 추가한 이름.
// listBuckets가 권한 문제로 실패/빈 배열이어도 직접 추가한 버킷은 계속 보여준다.
export type SidebarBucket = { id: string; name: string; manual: boolean };

export function useBuckets() {
  const [fetched, setFetched] = useState<BucketInfo[]>([]);
  const [manual, setManual] = useState<string[]>(() => {
    const url = getConfig()?.url;
    return url ? getManualBuckets(url) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const url = getConfig()?.url;
    setManual(url ? getManualBuckets(url) : []);
    const client = getSupabase();
    if (!client) {
      setFetched([]);
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
        setFetched(list);
        setLoading(false);
      })
      .catch((err) => {
        setFetched([]);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [tick]);

  const addBucket = useCallback((name: string) => {
    const url = getConfig()?.url;
    if (!url) return;
    setManual(addManualBucket(url, name));
  }, []);

  const removeBucket = useCallback((name: string) => {
    const url = getConfig()?.url;
    if (!url) return;
    setManual(removeManualBucket(url, name));
  }, []);

  // 나중에 목록 권한이 생겨 같은 이름이 listBuckets로도 오면 fetched 쪽만 보여준다
  const fetchedNames = new Set(fetched.map((b) => b.name));
  const buckets: SidebarBucket[] = [
    ...fetched.map((b) => ({ id: b.id, name: b.name, manual: false })),
    ...manual
      .filter((name) => !fetchedNames.has(name))
      .map((name) => ({ id: `manual:${name}`, name, manual: true })),
  ];

  return { buckets, loading, error, refresh, addBucket, removeBucket };
}
