import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"

const BUCKET_PHOTOS = "wedding-photos"
const BUCKET_THUMBS = "wedding-thumbs"
const SIGNED_EXPIRY = 3600

function getIdFromPath(path: string): string | null {
  const match = path.match(/\/photo\/([a-f0-9-]{36})/i)
  return match ? match[1] : null
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  const id = getIdFromPath(event.path) || event.queryStringParameters?.id
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing photo id" }) }
  }

  try {
    const { data: row, error } = await supabaseAdmin
      .from("submissions")
      .select("id, caption, created_at, image_path, thumb_path, width, height")
      .eq("id", id)
      .eq("status", "approved")
      .single()

    if (error || !row) {
      return { statusCode: 404, body: JSON.stringify({ error: "Photo not found" }) }
    }

    const [imageSigned, thumbSigned] = await Promise.all([
      supabaseAdmin.storage.from(BUCKET_PHOTOS).createSignedUrl(row.image_path, SIGNED_EXPIRY),
      supabaseAdmin.storage.from(BUCKET_THUMBS).createSignedUrl(row.thumb_path, SIGNED_EXPIRY),
    ])

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        caption: row.caption,
        created_at: row.created_at,
        image_url: imageSigned.data?.signedUrl ?? "",
        thumb_url: thumbSigned.data?.signedUrl ?? "",
        width: row.width ?? 0,
        height: row.height ?? 0,
      }),
    }
  } catch (err) {
    console.error("photo error", err)
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) }
  }
}
