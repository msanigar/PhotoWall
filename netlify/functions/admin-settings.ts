import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"
import { getAdminUserId } from "./_shared/auth.js"
import { getApprovalsEnabled } from "./_shared/settings.js"
import { z } from "zod"

const KEY = "approvals_enabled"

export const handler: Handler = async (event: HandlerEvent) => {
  const userId = await getAdminUserId(event)
  if (!userId) {
    return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Unauthorized" }) }
  }

  if (event.httpMethod === "GET") {
    const enabled = await getApprovalsEnabled()
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalsEnabled: enabled }),
    }
  }

  if (event.httpMethod === "PATCH" || event.httpMethod === "POST") {
    const bodySchema = z.object({ approvalsEnabled: z.boolean() })
    const parsed = bodySchema.safeParse(event.body ? JSON.parse(event.body) : {})
    if (!parsed.success) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid body" }) }
    }
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: KEY, value: { enabled: parsed.data.approvalsEnabled }, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
    if (error) {
      return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Failed to update" }) }
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalsEnabled: parsed.data.approvalsEnabled }),
    }
  }

  return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method Not Allowed" }) }
}
