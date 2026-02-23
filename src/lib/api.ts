const API = "/.netlify/functions"

export type SubmissionPreview = {
  id: string
  caption: string
  created_at: string
  thumb_url: string
}

export type PhotoDetail = SubmissionPreview & {
  image_url: string
  width: number
  height: number
}

export type GalleryResponse = {
  items: SubmissionPreview[]
  nextCursor: string | null
}

export async function fetchGallery(cursor?: string): Promise<GalleryResponse> {
  const url = cursor ? `${API}/gallery?cursor=${encodeURIComponent(cursor)}` : `${API}/gallery`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load gallery")
  return res.json()
}

export async function fetchPhoto(id: string): Promise<PhotoDetail> {
  const res = await fetch(`${API}/photo/${id}`)
  if (!res.ok) throw new Error("Photo not found")
  return res.json()
}

export async function submitPhoto(formData: FormData): Promise<{ id: string }> {
  let res: Response
  try {
    res = await fetch(`${API}/submit`, {
      method: "POST",
      body: formData,
    })
  } catch (e) {
    throw new Error(
      (e as Error).message?.toLowerCase().includes("fetch")
        ? "Network error. Check your connection and try again."
        : (e as Error).message || "Upload failed. Please try again."
    )
  }
  const text = await res.text()
  let data: { id?: string; error?: string } = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    // Server returned non-JSON (e.g. HTML error page)
    if (!res.ok) {
      throw new Error(`Upload failed (${res.status}). Please try again.`)
    }
  }
  if (!res.ok) {
    throw new Error(data.error ?? `Upload failed (${res.status}). Please try again.`)
  }
  return data as { id: string }
}

export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await import("@/lib/supabase").then((m) => m.supabase.auth.getSession())
  return session?.access_token ?? null
}

export async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  if (!token) throw new Error("Not authenticated")
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  }
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && typeof data.error === "string" ? data.error : null) ?? `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

export type AdminSubmission = SubmissionPreview & {
  status: string
  image_url?: string
}

export type AdminListResponse = {
  items: AdminSubmission[]
  nextCursor: string | null
}

export async function fetchAdminPending(cursor?: string): Promise<AdminListResponse> {
  const url = cursor ? `/admin-pending?cursor=${encodeURIComponent(cursor)}` : "/admin-pending"
  return adminFetch<AdminListResponse>(url)
}

export async function fetchAdminApproved(cursor?: string): Promise<AdminListResponse> {
  const url = cursor ? `/admin-approved?cursor=${encodeURIComponent(cursor)}` : "/admin-approved"
  return adminFetch<AdminListResponse>(url)
}

export async function fetchAdminRejected(cursor?: string): Promise<AdminListResponse> {
  const url = cursor ? `/admin-rejected?cursor=${encodeURIComponent(cursor)}` : "/admin-rejected"
  return adminFetch<AdminListResponse>(url)
}

export function adminApprove(id: string): Promise<void> {
  return adminFetch("/admin-approve", { method: "POST", body: JSON.stringify({ id }) })
}

export function adminReject(id: string): Promise<void> {
  return adminFetch("/admin-reject", { method: "POST", body: JSON.stringify({ id }) })
}

export function adminEditCaption(id: string, caption: string): Promise<void> {
  return adminFetch("/admin-edit-caption", { method: "POST", body: JSON.stringify({ id, caption }) })
}

export function adminDelete(id: string): Promise<void> {
  return adminFetch("/admin-delete", { method: "POST", body: JSON.stringify({ id }) })
}

export type AdminSettings = { approvalsEnabled: boolean }

export async function fetchAdminSettings(): Promise<AdminSettings> {
  return adminFetch<AdminSettings>("/admin-settings")
}

export async function updateAdminSettings(settings: AdminSettings): Promise<AdminSettings> {
  return adminFetch<AdminSettings>("/admin-settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  })
}

export async function adminExport(): Promise<Blob> {
  const token = await getAccessToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(`${API}/admin-export`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Export failed")
  return res.blob()
}
