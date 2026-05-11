import type { SupabaseClient } from '@supabase/supabase-js';

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
