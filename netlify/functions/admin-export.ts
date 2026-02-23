import type { Handler, HandlerEvent } from "@netlify/functions"
import { supabaseAdmin } from "./_shared/supabase.js"
import { getAdminUserId } from "./_shared/auth.js"

const BUCKET_PHOTOS = "wedding-photos"
const BUCKET_THUMBS = "wedding-thumbs"
const SIGNED_EXPIRY = 86400 // 24h for export

function escapeCsv(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  const userId = await getAdminUserId(event)
  if (!userId) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    }
  }

  const { data: rows, error } = await supabaseAdmin
    .from("submissions")
    .select("id, status, caption, created_at, approved_at, image_path, thumb_path")
    .order("created_at", { ascending: false })

  if (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Export failed" }),
    }
  }

  const lines: string[] = [
    "id,status,caption,created_at,approved_at,image_signed_url,thumb_signed_url",
  ]

  for (const row of rows) {
    const [imgSigned, thumbSigned] = await Promise.all([
      supabaseAdmin.storage.from(BUCKET_PHOTOS).createSignedUrl(row.image_path, SIGNED_EXPIRY),
      supabaseAdmin.storage.from(BUCKET_THUMBS).createSignedUrl(row.thumb_path, SIGNED_EXPIRY),
    ])
    const imageUrl = imgSigned.data?.signedUrl ?? ""
    const thumbUrl = thumbSigned.data?.signedUrl ?? ""
    lines.push(
      [
        row.id,
        row.status,
        escapeCsv(row.caption ?? ""),
        row.created_at ?? "",
        row.approved_at ?? "",
        imageUrl,
        thumbUrl,
      ].join(",")
    )
  }

  const csv = lines.join("\n")

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wedding-photos-export.csv"',
    },
    body: csv,
  }
}
