/**
 * invokeEdgeFunction
 *
 * Calls a Supabase Edge Function directly using the real VITE_SUPABASE_URL,
 * bypassing the miaoda-sc-plugin proxy fetch adapter which rewrites Supabase
 * URLs to a relative path and causes Edge Function requests to return status 0.
 *
 * Returns { data, error } matching the shape of supabase.functions.invoke.
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  options: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    /** Pass the Supabase session access token if available */
    accessToken?: string | null;
  } = {}
): Promise<{ data: T | null; error: Error | null }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl) {
    return { data: null, error: new Error('VITE_SUPABASE_URL is not set') };
  }

  const url = `${supabaseUrl}/functions/v1/${name}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    ...options.headers,
  };

  if (options.accessToken) {
    headers['Authorization'] = `Bearer ${options.accessToken}`;
  } else if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  try {
    // Use the native window.fetch to skip the proxy rewrite entirely
    const response = await window.fetch(url, {
      method: 'POST',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }

    if (!response.ok) {
      const msg =
        (json as any)?.message ||
        (json as any)?.error ||
        `Edge Function ${name} returned ${response.status}`;
      return { data: null, error: new Error(msg) };
    }

    return { data: json as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
