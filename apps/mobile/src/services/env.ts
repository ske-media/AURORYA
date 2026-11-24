// Configuration publique de l'app, fournie par EAS (SPEC §15.10). Aucun secret ici.
export type AppEnv = Readonly<{ apiBaseUrl: string; supabaseUrl: string; supabaseAnonKey: string }>;

/** Null si l'app n'est pas configurée : elle l'affiche alors clairement au lieu de simuler. */
export function readEnv(): AppEnv | null {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!apiBaseUrl || !supabaseUrl || !supabaseAnonKey) return null;
  return { apiBaseUrl: apiBaseUrl.replace(/\/$/, ''), supabaseUrl, supabaseAnonKey };
}
