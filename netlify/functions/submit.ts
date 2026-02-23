import type { Handler, HandlerEvent } from "@netlify/functions"
import Busboy from "busboy"
import { Readable } from "stream"
import { createHash } from "crypto"
import { supabaseAdmin } from "./_shared/supabase.js"
import { getSubmitRateLimiter, getClientIp } from "./_shared/rate-limit.js"
import { z } from "zod"

const CAPTION_MAX = 140
const MAX_SIZE_BYTES = 6 * 1024 * 1024 // 6 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"]
const IMAGE_MAX_EDGE = 1920
const THUMB_MAX_EDGE = 480
const JPEG_QUALITY = 82
const BUCKET_PHOTOS = "wedding-photos"
const BUCKET_THUMBS = "wedding-thumbs"

const schema = z.object({
  caption: z.string().max(CAPTION_MAX).transform((s) => s.trim().replace(/\s+/g, " ")),
  device_id: z.string().min(1).max(128),
  fingerprint: z.string().min(1).max(512),
})

function hashWithSalt(value: string, salt: string): string {
  return createHash("sha256").update(salt + value).digest("hex")
}

function parseMultipart(
  body: string | undefined,
  isBase64: boolean,
  contentType: string
): Promise<{ photo: Buffer; caption: string; device_id: string; fingerprint: string }> {
  return new Promise((resolve, reject) => {
    const raw = body
      ? isBase64
        ? Buffer.from(body, "base64")
        : Buffer.from(body, "utf8")
      : Buffer.alloc(0)
    const stream = Readable.from(raw)

    const fields: Record<string, string> = {}
    let photoBuffer: Buffer | null = null
    const chunks: Buffer[] = []

    const bb = Busboy({ headers: { "content-type": contentType } })

    bb.on("file", (name, file, info) => {
      if (name !== "photo") {
        file.resume()
        return
      }
      file.on("data", (chunk: Buffer) => chunks.push(chunk))
      file.on("end", () => {
        photoBuffer = Buffer.concat(chunks)
      })
    })

    bb.on("field", (name, value) => {
      fields[name] = value
    })

    bb.on("finish", () => {
      const caption = (fields.caption ?? "").trim().replace(/\s+/g, " ")
      const device_id = fields.device_id ?? ""
      const fingerprint = fields.fingerprint ?? ""
      if (!photoBuffer || photoBuffer.length === 0) {
        reject(new Error("Missing photo file"))
        return
      }
      resolve({
        photo: photoBuffer,
        caption,
        device_id,
        fingerprint,
      })
    })

    bb.on("error", reject)
    stream.pipe(bb)
  })
}

function jsonError(statusCode: number, message: string) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message }),
  }
}

export const handler: Handler = async (event: HandlerEvent) => {
  try {
    return await handleSubmit(event)
  } catch (err) {
    console.error("submit unhandled error", err)
    return jsonError(
      500,
      err instanceof Error ? err.message : "Upload failed. Please try again."
    )
  }
}

async function handleSubmit(event: HandlerEvent) {
  if (event.httpMethod !== "POST") {
    return jsonError(405, "Method Not Allowed")
  }

  if (process.env.SUBMISSIONS_ENABLED === "false") {
    return jsonError(503, "Submissions are temporarily disabled")
  }

  const ip = getClientIp(event)
  const salt = process.env.IP_HASH_SALT || "default-salt-change-me"
  const fpSalt = process.env.FINGERPRINT_HASH_SALT || "fp-salt-change-me"
  const ipHash = hashWithSalt(ip, salt)

  const limiter = getSubmitRateLimiter()
  if (limiter) {
    const { success } = await limiter.limit(`submit:ip:${ipHash}`)
    if (!success) {
      return jsonError(429, "Too many uploads. Please try again later.")
    }
  }

  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || ""
  if (!contentType.includes("multipart/form-data")) {
    return jsonError(400, "Expected multipart/form-data")
  }

  let photo: Buffer
  let caption: string
  let device_id: string
  let fingerprint: string

  try {
    const parsed = await parseMultipart(
      event.body,
      event.isBase64Encoded ?? false,
      contentType
    )
    photo = parsed.photo
    caption = parsed.caption
    device_id = parsed.device_id
    fingerprint = parsed.fingerprint
  } catch (e) {
    return jsonError(400, (e as Error).message || "Invalid request")
  }

  const parsed = schema.safeParse({ caption, device_id, fingerprint })
  if (!parsed.success) {
    return jsonError(400, "Invalid caption or missing device_id/fingerprint")
  }

  caption = parsed.data.caption

  if (photo.length > MAX_SIZE_BYTES) {
    return jsonError(413, "Image too large. Max 6 MB.")
  }

  let sharp: typeof import("sharp")
  try {
    sharp = (await import("sharp")).default
  } catch {
    return jsonError(500, "Image processing unavailable (sharp not installed)")
  }

  let imageBuffer: Buffer
  let thumbBuffer: Buffer
  let width: number
  let height: number
  let mime = "image/jpeg"

  try {
    const meta = await sharp(photo).metadata()
    const format = (meta.format as string)?.toLowerCase()
    if (!format || !["jpeg", "jpg", "png", "webp", "heif"].includes(format)) {
      return jsonError(415, "Unsupported image type. Use JPEG, PNG, WebP or HEIC.")
    }

    let pipeline = sharp(photo)
      .rotate()
      .resize(IMAGE_MAX_EDGE, IMAGE_MAX_EDGE, { fit: "inside", withoutEnlargement: true })

    if (format === "heif" || format === "heic") {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY })
      mime = "image/jpeg"
    } else {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY })
    }

    imageBuffer = await pipeline.toBuffer()
    const sizeMeta = await sharp(imageBuffer).metadata()
    width = sizeMeta.width ?? 0
    height = sizeMeta.height ?? 0

    thumbBuffer = await sharp(imageBuffer)
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
  } catch (err) {
    console.error("sharp error", err)
    return jsonError(415, "Invalid or unsupported image")
  }

  const uid = () => createHash("sha256").update(Math.random() + Date.now().toString()).digest("hex").slice(0, 16)
  const imagePath = `uploads/${uid()}-${uid()}.jpg`
  const thumbPath = `thumbs/${uid()}-${uid()}.jpg`

  const fingerprintHash = hashWithSalt(fingerprint, fpSalt)
  const userAgent = (event.headers["user-agent"] || event.headers["User-Agent"] || "").slice(0, 512)

  const { error: uploadImgErr } = await supabaseAdmin.storage
    .from(BUCKET_PHOTOS)
    .upload(imagePath, imageBuffer, { contentType: "image/jpeg", upsert: false })

  if (uploadImgErr) {
    console.error("storage upload image error", uploadImgErr)
    return jsonError(500, `Storage error: ${uploadImgErr.message}`)
  }

  const { error: uploadThumbErr } = await supabaseAdmin.storage
    .from(BUCKET_THUMBS)
    .upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: false })

  if (uploadThumbErr) {
    console.error("storage upload thumb error", uploadThumbErr)
    await supabaseAdmin.storage.from(BUCKET_PHOTOS).remove([imagePath])
    return jsonError(500, `Storage error: ${uploadThumbErr.message}`)
  }

  const { data: row, error: insertErr } = await supabaseAdmin
    .from("submissions")
    .insert({
      status: "pending",
      caption,
      image_path: imagePath,
      thumb_path: thumbPath,
      mime,
      size_bytes: imageBuffer.length,
      width,
      height,
      ip_hash: ipHash,
      device_id,
      fingerprint_hash: fingerprintHash,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertErr) {
    console.error("insert error", insertErr)
    await supabaseAdmin.storage.from(BUCKET_PHOTOS).remove([imagePath])
    await supabaseAdmin.storage.from(BUCKET_THUMBS).remove([thumbPath])
    return jsonError(500, `Database error: ${insertErr.message}`)
  }

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: row.id }),
  }
}
