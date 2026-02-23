import { createClient } from "@supabase/supabase-js"
import { supabaseAdmin } from "./supabase.js"
import { getHeader } from "./headers.js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export async function getAdminUserId(event: {
  headers: Headers | Record<string, string | undefined>
}): Promise<string | null> {
  try {
    const auth = getHeader(event.headers, "authorization")
    if (!auth?.startsWith("Bearer ")) return null
    const token = auth.slice(7)
    if (!supabaseUrl || !supabaseAnonKey) return null
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    const { data: admin } = await supabaseAdmin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .single()
    return admin ? user.id : null
  } catch {
    return null
  }
}
