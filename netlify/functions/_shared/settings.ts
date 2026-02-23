import { supabaseAdmin } from "./supabase.js"

const KEY = "approvals_enabled"

export async function getApprovalsEnabled(): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", KEY)
    .single()
  if (error || !data?.value) return true
  const v = data.value
  if (typeof v === "boolean") return v
  return (v as { enabled?: boolean }).enabled !== false
}
