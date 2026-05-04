import { useState, useEffect, useCallback } from 'react';
import type { FileObject } from '@supabase/storage-js';
import { getSupabase } from '../lib/supabaseClient';
import type { Track } from '../lib/tracks';

type TrackFilesState = {
  files: FileObject[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useTrackFiles(track: Track): TrackFilesState {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setFiles([]);
      setLoading(false);
      setError('Supabase 설정이 필요합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    supabase.storage
      .from('tablet-apk')
      .list(track, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
      .then(({ data, error: listError }) => {
        if (listError) {
          setError(listError.message);
          setFiles([]);
        } else {
          const filtered = (data ?? []).filter(
            (f) => f.name !== '.emptyFolderPlaceholder',
          );
          setFiles(filtered);
        }
        setLoading(false);
      });
  }, [track, tick]);

  return { files, loading, error, refresh };
}
