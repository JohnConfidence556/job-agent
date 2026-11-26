import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url || "http://localhost:54321", anonKey || "missing-key");
export const supabaseConfigured = Boolean(url && anonKey);
