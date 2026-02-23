import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"
import { getAdminUserId } from "./_shared/auth.js"
import { getApprovalsEnabled } from "./_shared/settings.js"
import { z } from "zod"

const bodySchema = z.object({ id: z.string().uuid() })

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) }
  }

  const userId = await getAdminUserId(event)
  if (!userId) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) }

  const approvalsEnabled = await getApprovalsEnabled()
  if (!approvalsEnabled) {
    return { statusCode: 503, body: JSON.stringify({ error: "Approvals are currently disabled" }) }
  }

  const parsed = bodySchema.safeParse(event.body ? JSON.parse(event.body) : {})
  if (!parsed.success) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid id" }) }
  }

  const { error } = await supabaseAdmin
    .from("submissions")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejected_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .in("status", ["pending"])

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to reject" }) }
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: "{}" }
}
