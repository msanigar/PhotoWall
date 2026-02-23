import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"
import { getAdminUserId } from "./_shared/auth.js"
import { z } from "zod"

const bodySchema = z.object({
  id: z.string().uuid(),
  caption: z.string().max(140).transform((s) => s.trim().replace(/\s+/g, " ")),
})

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) }
  }

  const userId = await getAdminUserId(event)
  if (!userId) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) }

  const parsed = bodySchema.safeParse(event.body ? JSON.parse(event.body) : {})
  if (!parsed.success) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid id or caption" }) }
  }

  const { error } = await supabaseAdmin
    .from("submissions")
    .update({
      caption: parsed.data.caption,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to update caption" }) }
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: "{}" }
}
