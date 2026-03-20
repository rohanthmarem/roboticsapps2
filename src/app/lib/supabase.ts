import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: options?.signal ?? AbortSignal.timeout(15000),
      });
    },
  },
});

/** Retry wrapper for critical Supabase operations (saves, updates). */
export async function withRetry<T>(
  fn: () => Promise<{ data: T; error: any }>,
  maxRetries = 2,
): Promise<{ data: T; error: any }> {
  for (let i = 0; i <= maxRetries; i++) {
    const result = await fn();
    if (!result.error || i === maxRetries) return result;
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  return fn();
}
