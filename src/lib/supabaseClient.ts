import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig, subscribeConfig } from './config';

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getConfig();
  if (!config) {
    cachedClient = null;
    cachedKey = null;
    return null;
  }
  const key = config.url + '|' + config.apiKey + '|' + config.authKey;
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }
  cachedClient = createClient(config.url, config.apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${config.authKey}`,
      },
    },
  });
  cachedKey = key;
  return cachedClient;
}

export function resetSupabase(): void {
  cachedClient = null;
  cachedKey = null;
}

// Auto-reset when config changes
subscribeConfig(resetSupabase);
