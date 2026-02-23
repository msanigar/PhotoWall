import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"
import { getAdminUserId } from "./_shared/auth.js"
import { getAdminRateLimiter, getClientIp } from "./_shared/rate-limit.js"

const BUCKET_THUMBS = "wedding-thumbs"
const SIGNED_EXPIRY = 3600
const LIMIT = 20

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

const jsonResponse = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event: HandlerEvent) => {
  try {
    if (event.httpMethod !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" })
    }

    const userId = await getAdminUserId(event)
    if (!userId) {
      return jsonResponse(401, { error: "Unauthorized" })
    }

    const limiter = getAdminRateLimiter()
    if (limiter) {
      const ip = getClientIp(event)
      const { success } = await limiter.limit(`admin:${userId}:${ip}`)
      if (!success) {
        return jsonResponse(429, { error: "Too many requests" })
      }
    }

    const cursor = event.queryStringParameters?.cursor ?? null

    let q = supabaseAdmin
      .from("submissions")
      .select("id, caption, created_at, thumb_path, status")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(LIMIT + 1)

    if (cursor) {
      const [createdAt, id] = decodeCursor(cursor)
      if (createdAt && id) {
        q = q.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`)
      }
    }

    const { data: rows, error } = await q

    if (error) {
      console.error("admin-pending query error", error)
      return jsonResponse(500, { error: "Failed to load submissions" })
    }

    const hasMore = rows.length > LIMIT
    const items = hasMore ? rows.slice(0, LIMIT) : rows
    const nextCursor =
      hasMore && items.length
        ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
        : null

    const withUrls = await Promise.all(
      items.map(
        async (row: { id: string; caption: string; created_at: string; thumb_path: string }) => {
          const { data: signed } = await supabaseAdmin.storage
            .from(BUCKET_THUMBS)
            .createSignedUrl(row.thumb_path, SIGNED_EXPIRY)
          return {
            ...row,
            thumb_url: signed?.signedUrl ?? "",
          }
        }
      )
    )

    return jsonResponse(200, { items: withUrls, nextCursor })
  } catch (err) {
    console.error("admin-pending error", err)
    return jsonResponse(500, {
      error: err instanceof Error ? err.message : "Request failed",
    })
  }
}
