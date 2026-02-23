import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"
import { getAdminUserId } from "./_shared/auth.js"
import { z } from "zod"

const bodySchema = z.object({ id: z.string().uuid() })

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) }
  }

  const userId = await getAdminUserId(event)
  if (!userId) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) }

  const parsed = bodySchema.safeParse(event.body ? JSON.parse(event.body) : {})
  if (!parsed.success) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid id" }) }
  }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("submissions")
    .select("image_path, thumb_path")
    .eq("id", parsed.data.id)
    .single()

  const { error: updateErr } = await supabaseAdmin
    .from("submissions")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)

  if (updateErr) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to delete" }) }
  }

  if (!fetchErr && row?.image_path) {
    await supabaseAdmin.storage.from("wedding-photos").remove([row.image_path])
    if (row.thumb_path) {
      await supabaseAdmin.storage.from("wedding-thumbs").remove([row.thumb_path])
    }
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: "{}" }
}
