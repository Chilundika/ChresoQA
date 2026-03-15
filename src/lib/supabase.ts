import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a dummy client that won't crash during SSR/build
        // At runtime in the browser, the env vars should be available
        if (typeof window === 'undefined') {
            return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key');
        }
        throw new Error(
            'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        );
    }

    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
}

// Export as a getter for backward-compatible usage: supabase.from(...)
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop: string) {
        const client = getSupabase();
        const value = (client as unknown as Record<string, unknown>)[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    },
});
