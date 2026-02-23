import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"

const BUCKET_THUMBS = "wedding-thumbs"
const SIGNED_EXPIRY = 3600 // 1 hour

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  const cursor = event.queryStringParameters?.cursor ?? null
  const limit = 20

  try {
    let q = supabaseAdmin
      .from("submissions")
      .select("id, caption, created_at, thumb_path")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      const [createdAt, id] = decodeCursor(cursor)
      if (createdAt && id) {
        q = q.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`)
      }
    }

    const { data: rows, error } = await q

    if (error) {
      console.error("gallery query error", error)
      return { statusCode: 500, body: JSON.stringify({ error: "Failed to load gallery" }) }
    }

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && items.length
        ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
        : null

    const itemsWithUrls = await Promise.all(
      items.map(async (row: { id: string; caption: string; created_at: string; thumb_path: string }) => {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET_THUMBS)
          .createSignedUrl(row.thumb_path, SIGNED_EXPIRY)
        return {
          id: row.id,
          caption: row.caption,
          created_at: row.created_at,
          thumb_url: signed?.signedUrl ?? "",
        }
      })
    )

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: itemsWithUrls, nextCursor }),
    }
  } catch (err) {
    console.error("gallery error", err)
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) }
  }
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify([createdAt, id])).toString("base64url")
}

function decodeCursor(cursor: string): [string | null, string | null] {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString()) as [string, string]
    return decoded
  } catch {
    return [null, null]
  }
}
